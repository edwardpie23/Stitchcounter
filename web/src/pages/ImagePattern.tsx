import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, ImageIcon, Download, Save, Trash2, ChevronLeft,
  ZoomIn, ZoomOut, Paintbrush, ArrowLeft, Grid3x3, ShoppingBag,
  ChevronUp, ChevronDown, List, X, Eraser,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaletteColor {
  hex: string
  dmcCode: string
  dmcName: string
  count: number
}

interface ConvertResult {
  width: number
  height: number
  gridData: number[]
  colors: PaletteColor[]
}

interface SavedPattern {
  id: string
  name: string
  width: number
  height: number
  craftType: string
  colors: PaletteColor[]
  createdAt: string
}

interface RowSegment { count: number; colorIdx: number; color: PaletteColor | undefined }

const CRAFT_TYPES = [
  { value: 'knitting', label: 'Knitting Colorwork' },
  { value: 'crochet', label: 'Crochet (Pixel/Graphgan)' },
  { value: 'c2c', label: 'Crochet C2C (Corner-to-Corner)' },
  { value: 'cross-stitch', label: 'Cross Stitch' },
]

// Auto-defaults per craft type
function craftDefaults(craftType: string) {
  if (craftType === 'crochet') return { startFromBottom: true, alternateDirection: true }
  if (craftType === 'knitting') return { startFromBottom: false, alternateDirection: true }
  return { startFromBottom: false, alternateDirection: false }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}

function colorDistance(a: string, b: string) {
  const ra = hexToRgb(a), rb = hexToRgb(b)
  return Math.sqrt((ra.r - rb.r) ** 2 + (ra.g - rb.g) ** 2 + (ra.b - rb.b) ** 2)
}

// displayRow is 1-indexed; canvasRow is 0-indexed from top
function displayToCanvasRow(displayRow: number, totalRows: number, startFromBottom: boolean) {
  return startFromBottom ? totalRows - displayRow : displayRow - 1
}

// Row 1 never reverses; even rows (2, 4, …) reverse when alternating
function isRowReversed(displayRow: number, alternateDirection: boolean) {
  return alternateDirection && displayRow % 2 === 0
}

function generateRowDesc(
  canvasRow: number,
  width: number,
  gridData: number[],
  colors: PaletteColor[],
  reverse = false,
): RowSegment[] {
  const segments: RowSegment[] = []
  if (!width || !colors.length) return segments

  const base = canvasRow * width
  const idxAt = (i: number) => gridData[base + (reverse ? width - 1 - i : i)] ?? 0

  let lastColorIdx = idxAt(0)
  let count = 1

  for (let i = 1; i < width; i++) {
    const ci = idxAt(i)
    if (ci === lastColorIdx) { count++ }
    else {
      segments.push({ count, colorIdx: lastColorIdx, color: colors[lastColorIdx] })
      lastColorIdx = ci; count = 1
    }
  }
  segments.push({ count, colorIdx: lastColorIdx, color: colors[lastColorIdx] })
  return segments
}

// ─── Background removal (canvas flood-fill from corners) ─────────────────────
async function removeBackgroundFromUrl(url: string, tolerance: number): Promise<Blob> {
  const img = new Image()
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url })

  const MAX = 1500
  let w = img.naturalWidth, h = img.naturalHeight
  if (w > MAX || h > MAX) { const s = MAX / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s) }

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  // Average background color from all 4 corners
  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]
  let rS = 0, gS = 0, bS = 0
  for (const [x, y] of corners) { const i = (y * w + x) * 4; rS += data[i]; gS += data[i + 1]; bS += data[i + 2] }
  const bgR = rS / 4, bgG = gS / 4, bgB = bS / 4

  const thresh = tolerance * 2.55 // 0-100 → 0-255
  const visited = new Uint8Array(w * h)
  const queue: number[] = []

  for (const [x, y] of corners) {
    const pi = y * w + x
    if (!visited[pi]) { visited[pi] = 1; queue.push(pi) }
  }

  let head = 0
  while (head < queue.length) {
    const pi = queue[head++]
    const x = pi % w, y = Math.floor(pi / w)
    data[pi * 4 + 3] = 0 // transparent

    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const ni = ny * w + nx
      if (visited[ni]) continue
      const di = ni * 4
      const dist = Math.sqrt((data[di] - bgR) ** 2 + (data[di + 1] - bgG) ** 2 + (data[di + 2] - bgB) ** 2)
      if (dist <= thresh) { visited[ni] = 1; queue.push(ni) }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'))
}

// ─── Canvas Grid Component ────────────────────────────────────────────────────
function GridCanvas({
  width, height, gridData, colors, cellSize, selectedColor, onEdit, highlightRow,
}: {
  width: number; height: number; gridData: number[]; colors: PaletteColor[]
  cellSize: number; selectedColor: number | null; onEdit: (idx: number) => void; highlightRow: number | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const colorIdx = gridData[row * width + col] ?? 0
        ctx.fillStyle = colors[colorIdx]?.hex ?? '#ccc'
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
      }
    }

    if (cellSize >= 6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5
      for (let col = 0; col <= width; col++) { ctx.beginPath(); ctx.moveTo(col * cellSize, 0); ctx.lineTo(col * cellSize, height * cellSize); ctx.stroke() }
      for (let row = 0; row <= height; row++) { ctx.beginPath(); ctx.moveTo(0, row * cellSize); ctx.lineTo(width * cellSize, row * cellSize); ctx.stroke() }
    }

    if (cellSize >= 4) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1
      for (let col = 0; col <= width; col += 10) { ctx.beginPath(); ctx.moveTo(col * cellSize, 0); ctx.lineTo(col * cellSize, height * cellSize); ctx.stroke() }
      for (let row = 0; row <= height; row += 10) { ctx.beginPath(); ctx.moveTo(0, row * cellSize); ctx.lineTo(width * cellSize, row * cellSize); ctx.stroke() }
    }

    if (highlightRow !== null && highlightRow >= 0 && highlightRow < height) {
      ctx.fillStyle = 'rgba(59,130,246,0.15)'
      ctx.fillRect(0, highlightRow * cellSize, width * cellSize, cellSize)
      ctx.strokeStyle = 'rgba(59,130,246,0.8)'; ctx.lineWidth = 2
      ctx.strokeRect(1, highlightRow * cellSize + 1, width * cellSize - 2, cellSize - 2)
    }
  }, [width, height, gridData, colors, cellSize, highlightRow])

  useEffect(() => { draw() }, [draw])

  const getCellIdx = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / cellSize)
    const row = Math.floor((e.clientY - rect.top) / cellSize)
    return (col >= 0 && col < width && row >= 0 && row < height) ? row * width + col : -1
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedColor === null) return
    isDrawing.current = true
    const idx = getCellIdx(e); if (idx >= 0) onEdit(idx)
  }
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || selectedColor === null) return
    const idx = getCellIdx(e); if (idx >= 0) onEdit(idx)
  }
  const handleMouseUp = () => { isDrawing.current = false }

  return (
    <canvas
      ref={canvasRef}
      width={width * cellSize} height={height * cellSize}
      style={{ cursor: selectedColor !== null ? 'crosshair' : 'default', display: 'block' }}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
    />
  )
}

// ─── Palette Panel ────────────────────────────────────────────────────────────
function PalettePanel({
  colors, selectedColor, onSelect, gridData, gridWidth, gridHeight,
  yardagePerSkein, onYardageChange, onRemoveColor,
}: {
  colors: PaletteColor[]; selectedColor: number | null; onSelect: (idx: number | null) => void
  gridData: number[]; gridWidth: number; gridHeight: number
  yardagePerSkein: number; onYardageChange: (v: number) => void; onRemoveColor: (idx: number) => void
}) {
  const totalCells = gridWidth * gridHeight
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Color Palette</h3>
        <p className="text-xs text-gray-400 mb-3">Click color to paint · × to remove</p>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                onClick={() => onSelect(selectedColor === i ? null : i)}
                className={`flex-1 flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                  selectedColor === i ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="w-6 h-6 rounded-lg flex-shrink-0 border border-gray-200 dark:border-gray-600" style={{ backgroundColor: c.hex }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">DMC {c.dmcCode}</p>
                  <p className="text-xs text-gray-400 truncate">{c.dmcName}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{c.count} st</span>
              </button>
              <button
                onClick={() => onRemoveColor(i)}
                disabled={colors.length <= 1}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove color (fills with nearest)"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        {selectedColor !== null && (
          <button onClick={() => onSelect(null)} className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex items-center gap-1 justify-center">
            <ArrowLeft size={11} /> Deselect brush
          </button>
        )}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center gap-1.5 mb-3">
          <ShoppingBag size={14} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Skein Calculator</h3>
        </div>
        <div className="mb-3">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Yards per skein</label>
          <input
            type="number" min="1" value={yardagePerSkein}
            onChange={e => onYardageChange(Math.max(1, parseInt(e.target.value) || 200))}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="space-y-1.5">
          {colors.map((c, i) => {
            const pct = totalCells > 0 ? (c.count / totalCells) * 100 : 0
            const yardsNeeded = Math.ceil(c.count * 1.2)
            const skeins = Math.ceil(yardsNeeded / yardagePerSkein)
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: c.hex }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600 dark:text-gray-400 truncate">DMC {c.dmcCode}</span>
                    <span className="text-gray-500 ml-1">{skeins} skein{skeins !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: c.hex }} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0">{yardsNeeded}y</span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2 italic">Estimate based on ~1.2 yds/stitch. Adjust per your gauge.</p>
      </div>
    </div>
  )
}

// ─── Written Description Panel ────────────────────────────────────────────────
function WrittenDescription({
  width, height, gridData, colors, currentRow, onRowClick,
  startFromBottom, alternateDirection, onStartFromBottomChange, onAlternateChange,
}: {
  width: number; height: number; gridData: number[]; colors: PaletteColor[]
  currentRow: number | null; onRowClick: (row: number) => void
  startFromBottom: boolean; alternateDirection: boolean
  onStartFromBottomChange: (v: boolean) => void; onAlternateChange: (v: boolean) => void
}) {
  const currentRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentRow])

  return (
    <div>
      {/* Settings */}
      <div className="space-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox" checked={startFromBottom}
            onChange={e => onStartFromBottomChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300">Row 1 starts at the <strong>bottom</strong></span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox" checked={alternateDirection}
            onChange={e => onAlternateChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300">Alternating direction (even rows go ←)</span>
        </label>
        <p className="text-xs text-gray-400">Click any row to track it. ↑/↓ keys to navigate.</p>
      </div>

      {(!width || !height || !colors.length) ? (
        <p className="text-xs text-gray-400 text-center py-8">No pattern loaded.</p>
      ) : (
        <div className="space-y-1">
          {Array.from({ length: height }, (_, i) => {
            // displayRow is 1-indexed (1 = first row to work)
            const displayRow = i + 1
            const canvasRow = displayToCanvasRow(displayRow, height, startFromBottom)
            const reversed = isRowReversed(displayRow, alternateDirection)
            const isCurrent = currentRow === i // currentRow is 0-indexed display row
            const segments = generateRowDesc(canvasRow, width, gridData, colors, reversed)

            return (
              <div
                key={i}
                ref={isCurrent ? currentRowRef : undefined}
                onClick={() => onRowClick(i)}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {/* Row header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs font-bold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    Row {displayRow}
                  </span>
                  <span className="text-xs text-gray-400">
                    {reversed ? '← right to left' : '→ left to right'}
                  </span>
                  {startFromBottom && (
                    <span className="text-xs text-gray-300 dark:text-gray-600 ml-auto">
                      {displayRow === 1 ? 'bottom' : displayRow === height ? 'top' : ''}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-xs bg-blue-500 text-white rounded px-1.5 py-0.5 ml-auto">working</span>
                  )}
                </div>

                {/* Stacked segments — each on its own line */}
                <div className="space-y-1">
                  {segments.map((seg, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-sm border border-gray-300 dark:border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: seg.color?.hex ?? '#ccc' }}
                      />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tabular-nums w-8">
                        {seg.count}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {seg.color?.dmcName || `DMC ${seg.color?.dmcCode}` || `Color ${seg.colorIdx}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ImagePattern() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'upload' | 'editor'>('upload')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processedFile, setProcessedFile] = useState<File | null>(null) // after bg removal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [bgTolerance, setBgTolerance] = useState(30)
  const [processingBg, setProcessingBg] = useState(false)
  const [settings, setSettings] = useState({ gridWidth: 50, gridHeight: 50, numColors: 10, craftType: 'knitting' })
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')

  // Editor state
  const [result, setResult] = useState<ConvertResult | null>(null)
  const [gridData, setGridData] = useState<number[]>([])
  const [colors, setColors] = useState<PaletteColor[]>([])
  const [cellSize, setCellSize] = useState(10)
  const [selectedColor, setSelectedColor] = useState<number | null>(null)
  const [patternName, setPatternName] = useState('My Pattern')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [yardagePerSkein, setYardagePerSkein] = useState(200)

  // Row guide state
  const [currentRow, setCurrentRow] = useState<number | null>(null) // 0-indexed display row
  const [startFromBottom, setStartFromBottom] = useState(false)
  const [alternateDirection, setAlternateDirection] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'colors' | 'rows'>('colors')
  const [includePDFDesc, setIncludePDFDesc] = useState(false)
  const [resizeW, setResizeW] = useState(50)
  const [resizeH, setResizeH] = useState(50)
  const gridScrollRef = useRef<HTMLDivElement>(null)

  // Saved patterns
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>([])
  const [loadingPatterns, setLoadingPatterns] = useState(false)

  // Update color counts when gridData changes
  useEffect(() => {
    if (!result || gridData.length === 0) return
    const counts = new Array(colors.length).fill(0)
    for (const idx of gridData) counts[idx] = (counts[idx] || 0) + 1
    setColors(prev => prev.map((c, i) => ({ ...c, count: counts[i] || 0 })))
  }, [gridData]) // eslint-disable-line

  // Sync resize inputs when result dimensions change
  useEffect(() => {
    if (result) { setResizeW(result.width); setResizeH(result.height) }
  }, [result?.width, result?.height]) // eslint-disable-line

  // Scroll grid canvas to highlighted canvas row
  useEffect(() => {
    if (currentRow === null || !gridScrollRef.current || !result) return
    const canvasRow = displayToCanvasRow(currentRow + 1, result.height, startFromBottom)
    gridScrollRef.current.scrollTo({ top: Math.max(0, canvasRow * cellSize - 120), behavior: 'smooth' })
  }, [currentRow, cellSize, result, startFromBottom])

  // Keyboard ↑/↓ navigation (only in editor, not when focused on inputs)
  useEffect(() => {
    if (step !== 'editor') return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()

      // "next row" direction: bottom-up → ArrowUp advances; top-down → ArrowDown advances
      const goNext = (e.key === 'ArrowUp' && startFromBottom) || (e.key === 'ArrowDown' && !startFromBottom)

      setCurrentRow(r => {
        const max = (result?.height ?? 1) - 1
        if (r === null) return goNext ? 0 : max
        return goNext ? Math.min(max, r + 1) : Math.max(0, r - 1)
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, startFromBottom, result?.height])

  const loadSavedPatterns = async () => {
    setLoadingPatterns(true)
    try {
      const res = await fetch('/api/image-patterns', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setSavedPatterns(data.patterns || [])
    } catch (e) { console.error(e) }
    finally { setLoadingPatterns(false) }
  }

  useEffect(() => { loadSavedPatterns() }, []) // eslint-disable-line

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setSelectedFile(file)
    setProcessedFile(null) // reset processed version
    setPreviewUrl(URL.createObjectURL(file))
    setConvertError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleRemoveBackground = async () => {
    if (!previewUrl) return
    setProcessingBg(true)
    try {
      const blob = await removeBackgroundFromUrl(previewUrl, bgTolerance)
      const file = new File([blob], selectedFile?.name ?? 'image.png', { type: 'image/png' })
      setProcessedFile(file)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (e) {
      console.error('Background removal failed', e)
    } finally {
      setProcessingBg(false)
    }
  }

  const handleConvert = async () => {
    const fileToSend = processedFile ?? selectedFile
    if (!fileToSend) return
    setConverting(true); setConvertError('')
    try {
      const form = new FormData()
      form.append('image', fileToSend)
      form.append('width', settings.gridWidth.toString())
      form.append('height', settings.gridHeight.toString())
      form.append('numColors', settings.numColors.toString())

      const res = await fetch('/api/image-patterns/convert', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Conversion failed') }

      const data: ConvertResult = await res.json()
      setResult(data)
      setGridData([...data.gridData])
      setColors(data.colors)
      setCurrentRow(null)

      const defaults = craftDefaults(settings.craftType)
      setStartFromBottom(defaults.startFromBottom)
      setAlternateDirection(defaults.alternateDirection)

      const maxDim = Math.max(data.width, data.height)
      setCellSize(maxDim <= 30 ? 16 : maxDim <= 60 ? 10 : maxDim <= 100 ? 7 : 5)
      setStep('editor')
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Conversion failed')
    } finally { setConverting(false) }
  }

  const handleCellEdit = useCallback((idx: number) => {
    if (selectedColor === null) return
    setGridData(prev => { const next = [...prev]; next[idx] = selectedColor; return next })
  }, [selectedColor])

  const handleResizeGrid = (newW: number, newH: number) => {
    if (!result) return
    newW = Math.min(200, Math.max(5, newW)); newH = Math.min(200, Math.max(5, newH))
    const newGrid = new Array(newW * newH).fill(0)
    for (let r = 0; r < Math.min(newH, result.height); r++)
      for (let c = 0; c < Math.min(newW, result.width); c++)
        newGrid[r * newW + c] = gridData[r * result.width + c] ?? 0
    setResult(prev => prev ? { ...prev, width: newW, height: newH } : null)
    setGridData(newGrid)
    if (currentRow !== null && currentRow >= newH) setCurrentRow(newH - 1)
  }

  const handleRemoveColor = (removeIdx: number) => {
    if (colors.length <= 1) return
    const removed = colors[removeIdx]
    const remaining = colors.filter((_, i) => i !== removeIdx)
    let nearestNewIdx = 0; let nearestDist = Infinity
    remaining.forEach((c, i) => { const d = colorDistance(removed.hex, c.hex); if (d < nearestDist) { nearestDist = d; nearestNewIdx = i } })
    const mapping = colors.map((_, oi) => oi === removeIdx ? nearestNewIdx : oi < removeIdx ? oi : oi - 1)
    setGridData(prev => prev.map(ci => mapping[ci] ?? 0))
    setColors(remaining)
    if (selectedColor === removeIdx) setSelectedColor(null)
    else if (selectedColor !== null && selectedColor > removeIdx) setSelectedColor(selectedColor - 1)
  }

  const handleSave = async () => {
    if (!result || !patternName.trim()) return
    setSaving(true); setSaveMsg('')
    try {
      const res = await fetch('/api/image-patterns', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: patternName, width: result.width, height: result.height, gridData, colors, craftType: settings.craftType }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveMsg('Saved! Going to projects…')
      await loadSavedPatterns()
      setTimeout(() => { setStep('upload'); setSaveMsg('') }, 1200)
    } catch { setSaveMsg('Save failed') }
    finally { setSaving(false) }
  }

  const handleExportPDF = async () => {
    if (!result) return
    const { jsPDF } = await import('jspdf')
    const cellPx = 4, margin = 20, paletteWidth = 80
    const canvasW = result.width * cellPx, canvasH = result.height * cellPx
    const pageW = margin * 2 + canvasW + paletteWidth + 10
    const pageH = Math.max(margin * 2 + canvasH + 40, margin * 2 + colors.length * 10 + 40)

    const doc = new jsPDF({ orientation: canvasW > canvasH ? 'landscape' : 'portrait', unit: 'pt', format: [pageW, pageH] })

    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text(patternName, margin, margin)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
    doc.text(`${result.width} × ${result.height} stitches · ${colors.length} colors · ${CRAFT_TYPES.find(c => c.value === settings.craftType)?.label ?? settings.craftType}`, margin, margin + 14)
    doc.setTextColor(0)

    const gridTop = margin + 26

    for (let row = 0; row < result.height; row++) {
      for (let col = 0; col < result.width; col++) {
        const color = colors[gridData[row * result.width + col] ?? 0]
        if (!color) continue
        const { r, g, b } = hexToRgb(color.hex)
        doc.setFillColor(r, g, b)
        doc.rect(margin + col * cellPx, gridTop + row * cellPx, cellPx, cellPx, 'F')
      }
    }

    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3)
    for (let col = 0; col <= result.width; col += 10) doc.line(margin + col * cellPx, gridTop, margin + col * cellPx, gridTop + result.height * cellPx)
    for (let row = 0; row <= result.height; row += 10) doc.line(margin, gridTop + row * cellPx, margin + result.width * cellPx, gridTop + row * cellPx)

    const legendX = margin + canvasW + 10
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text('Color Legend', legendX, gridTop); doc.setFont('helvetica', 'normal')
    colors.forEach((c, i) => {
      const y = gridTop + 12 + i * 10
      const { r, g, b } = hexToRgb(c.hex)
      doc.setFillColor(r, g, b); doc.rect(legendX, y - 6, 7, 7, 'F')
      doc.setDrawColor(180); doc.setLineWidth(0.3); doc.rect(legendX, y - 6, 7, 7, 'S')
      doc.setFontSize(7); doc.setTextColor(40); doc.text(`DMC ${c.dmcCode}`, legendX + 9, y)
      doc.setTextColor(100); doc.text(`${c.count} st`, legendX + 9, y + 6); doc.setTextColor(0)
    })

    doc.setFontSize(5); doc.setTextColor(120)
    for (let row = 0; row < result.height; row += 10) doc.text(`${row + 1}`, margin - 8, gridTop + row * cellPx + cellPx)
    for (let col = 0; col < result.width; col += 10) doc.text(`${col + 1}`, margin + col * cellPx, gridTop - 2)

    if (includePDFDesc) {
      doc.addPage()
      const pw = doc.internal.pageSize.getWidth()
      const ph = doc.internal.pageSize.getHeight()
      let yPos = margin
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0)
      doc.text(`${patternName} — Row-by-Row Instructions`, margin, yPos); yPos += 6
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120)
      doc.text(
        `${result.width} sts wide · ${startFromBottom ? 'Row 1 = bottom, reading up' : 'Row 1 = top, reading down'} · ${alternateDirection ? 'Alternating direction' : 'All rows left-to-right'}`,
        margin, yPos + 6,
      ); yPos += 18

      for (let i = 0; i < result.height; i++) {
        const displayRow = i + 1
        const canvasRow = displayToCanvasRow(displayRow, result.height, startFromBottom)
        const reversed = isRowReversed(displayRow, alternateDirection)
        const segments = generateRowDesc(canvasRow, result.width, gridData, colors, reversed)
        const direction = reversed ? '← R to L' : '→ L to R'
        const descText = segments.map(s => `${s.count} ${s.color?.dmcName || `DMC ${s.color?.dmcCode}`}`).join('  ·  ')

        if (yPos > ph - margin - 12) { doc.addPage(); yPos = margin }

        doc.setFont('helvetica', 'bold'); doc.setTextColor(40)
        doc.text(`Row ${displayRow} (${direction})`, margin, yPos)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(80)
        const lines = doc.splitTextToSize(descText, pw - margin * 2 - 40)
        doc.text(lines, margin + 40, yPos)
        yPos += Math.max(10, lines.length * 8) + 4
      }
    }

    doc.save(`${patternName.replace(/\s+/g, '_')}_pattern.pdf`)
  }

  const handleDeleteSaved = async (id: string) => {
    if (!confirm('Delete this pattern?')) return
    await fetch(`/api/image-patterns/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setSavedPatterns(p => p.filter(x => x.id !== id))
  }

  const handleLoadSaved = async (id: string) => {
    const res = await fetch(`/api/image-patterns/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json(); const p = data.pattern
    setResult({ width: p.width, height: p.height, gridData: p.gridData, colors: p.colors })
    setGridData([...p.gridData]); setColors(p.colors); setPatternName(p.name)
    setSettings(s => ({ ...s, craftType: p.craftType }))
    const defaults = craftDefaults(p.craftType)
    setStartFromBottom(defaults.startFromBottom); setAlternateDirection(defaults.alternateDirection)
    setCurrentRow(null)
    const maxDim = Math.max(p.width, p.height)
    setCellSize(maxDim <= 30 ? 16 : maxDim <= 60 ? 10 : maxDim <= 100 ? 7 : 5)
    setStep('editor')
  }

  // ── Upload Step ──
  if (step === 'upload') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Image to Pattern</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload a photo and convert it into a yarn pattern with DMC color matching</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload + background removal */}
          <div className="space-y-3">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }} />
              {previewUrl ? (
                <div className="space-y-3">
                  <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedFile?.name}</p>
                  <p className="text-xs text-brand-600 dark:text-brand-400">Click to change image</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Upload size={28} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Drop an image here</p>
                    <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF up to 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Background removal */}
            {previewUrl && (
              <div className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Eraser size={14} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Remove Background</h3>
                  <span className="text-xs text-gray-400">(flood-fill from corners)</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-500 w-20 flex-shrink-0">Tolerance: {bgTolerance}</label>
                  <input
                    type="range" min="5" max="80" value={bgTolerance}
                    onChange={e => setBgTolerance(parseInt(e.target.value))}
                    className="flex-1"
                  />
                </div>
                <button
                  onClick={handleRemoveBackground}
                  disabled={processingBg}
                  className="btn-secondary w-full text-sm"
                >
                  {processingBg ? (
                    <><div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" /> Removing…</>
                  ) : (
                    <><Eraser size={14} /> Remove Background</>
                  )}
                </button>
                {processedFile && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center">✓ Background removed — this image will be sent for conversion</p>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Grid3x3 size={16} /> Grid Settings
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Width (stitches)</label>
                  <input type="number" min="5" max="200" className="input" value={settings.gridWidth}
                    onChange={e => setSettings(s => ({ ...s, gridWidth: Math.min(200, Math.max(5, parseInt(e.target.value) || 50)) }))} />
                </div>
                <div>
                  <label className="label text-xs">Height (rows)</label>
                  <input type="number" min="5" max="200" className="input" value={settings.gridHeight}
                    onChange={e => setSettings(s => ({ ...s, gridHeight: Math.min(200, Math.max(5, parseInt(e.target.value) || 50)) }))} />
                </div>
              </div>
              <div>
                <label className="label text-xs">Number of Colors (max 50)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="2" max="50" className="flex-1" value={settings.numColors}
                    onChange={e => setSettings(s => ({ ...s, numColors: parseInt(e.target.value) }))} />
                  <span className="w-8 text-center font-semibold text-brand-600">{settings.numColors}</span>
                </div>
              </div>
              <div>
                <label className="label text-xs">Craft Type</label>
                <select className="input" value={settings.craftType}
                  onChange={e => setSettings(s => ({ ...s, craftType: e.target.value }))}>
                  {CRAFT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {convertError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {convertError}
              </div>
            )}

            <button onClick={handleConvert} disabled={!selectedFile || converting} className="btn-primary w-full">
              {converting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Converting…</>
              ) : (
                <><ImageIcon size={16} /> Convert to Pattern</>
              )}
            </button>
          </div>
        </div>

        {/* Saved Patterns / Projects */}
        {(savedPatterns.length > 0 || loadingPatterns) && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Projects</h2>
            {loadingPatterns ? (
              <div className="text-center text-sm text-gray-400 py-6">Loading projects…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedPatterns.map(p => (
                  <div key={p.id} className="card p-4 group hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.name}</h3>
                      <button onClick={() => handleDeleteSaved(p.id)}
                        className="btn-ghost p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      {p.width} × {p.height} · {p.colors.length} colors · {CRAFT_TYPES.find(c => c.value === p.craftType)?.label ?? p.craftType}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.colors.slice(0, 12).map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded" style={{ backgroundColor: c.hex }} title={`DMC ${c.dmcCode} - ${c.dmcName}`} />
                      ))}
                      {p.colors.length > 12 && <span className="text-xs text-gray-400">+{p.colors.length - 12}</span>}
                    </div>
                    <button onClick={() => handleLoadSaved(p.id)} className="btn-secondary w-full text-sm py-1.5">
                      Continue Editing
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Editor Step ──
  // Canvas row that should be highlighted (mapped from display row)
  const canvasHighlightRow = currentRow !== null && result
    ? displayToCanvasRow(currentRow + 1, result.height, startFromBottom)
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3 flex-wrap">
        <button onClick={() => setStep('upload')} className="btn-ghost text-sm">
          <ChevronLeft size={16} /> Projects
        </button>

        <div className="flex-1 min-w-32 max-w-56">
          <input className="input text-sm py-1.5" value={patternName}
            onChange={e => setPatternName(e.target.value)} placeholder="Pattern name" />
        </div>

        {selectedColor !== null && (
          <div className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-3 py-1.5 rounded-xl">
            <Paintbrush size={13} />
            Painting: DMC {colors[selectedColor]?.dmcCode}
            <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: colors[selectedColor]?.hex }} />
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setCellSize(s => Math.max(3, s - 2))} className="btn-ghost p-2" title="Zoom out"><ZoomOut size={16} /></button>
          <span className="text-xs text-gray-400 w-10 text-center">{cellSize}px</span>
          <button onClick={() => setCellSize(s => Math.min(24, s + 2))} className="btn-ghost p-2" title="Zoom in"><ZoomIn size={16} /></button>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
          <input type="checkbox" checked={includePDFDesc} onChange={e => setIncludePDFDesc(e.target.checked)} className="rounded border-gray-300" />
          Row guide in PDF
        </label>

        <button onClick={handleSave} disabled={saving} className="btn-secondary text-sm">
          <Save size={14} />
          {saving ? 'Saving…' : saveMsg || 'Save'}
        </button>

        <button onClick={handleExportPDF} className="btn-primary text-sm">
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* Info bar: resize + stats + row tracker */}
      <div className="flex-shrink-0 px-4 py-1.5 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
        <div className="flex items-center gap-1">
          <span>Grid:</span>
          <input
            type="number" min="5" max="200" value={resizeW}
            onChange={e => setResizeW(parseInt(e.target.value) || 5)}
            onBlur={() => handleResizeGrid(resizeW, resizeH)}
            onKeyDown={e => e.key === 'Enter' && handleResizeGrid(resizeW, resizeH)}
            className="w-14 text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
            title="Width — press Enter or click away to resize"
          />
          <span>×</span>
          <input
            type="number" min="5" max="200" value={resizeH}
            onChange={e => setResizeH(parseInt(e.target.value) || 5)}
            onBlur={() => handleResizeGrid(resizeW, resizeH)}
            onKeyDown={e => e.key === 'Enter' && handleResizeGrid(resizeW, resizeH)}
            className="w-14 text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
            title="Height — press Enter or click away to resize"
          />
          <span>st</span>
        </div>

        <span className="text-gray-300 dark:text-gray-700">|</span>
        <span>{colors.length} colors</span>
        <span>{CRAFT_TYPES.find(c => c.value === settings.craftType)?.label}</span>

        {/* Row tracker */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-gray-500">Row:</span>
          <button
            onClick={() => setCurrentRow(r => {
              const max = (result?.height ?? 1) - 1
              return startFromBottom ? (r !== null ? Math.min(max, r + 1) : 0) : (r !== null ? Math.max(0, r - 1) : 0)
            })}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title={startFromBottom ? 'Previous row' : 'Next row'}
          >
            <ChevronUp size={13} />
          </button>
          <input
            type="number" min="1" max={result?.height ?? 1}
            value={currentRow !== null ? currentRow + 1 : ''}
            placeholder="—"
            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && result) setCurrentRow(Math.min(result.height - 1, Math.max(0, v - 1))) }}
            className="w-12 text-xs text-center border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
            title="Current display row"
          />
          <button
            onClick={() => setCurrentRow(r => {
              const max = (result?.height ?? 1) - 1
              return startFromBottom ? (r !== null ? Math.max(0, r - 1) : max) : (r !== null ? Math.min(max, r + 1) : 0)
            })}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title={startFromBottom ? 'Next row' : 'Previous row'}
          >
            <ChevronDown size={13} />
          </button>
          {currentRow !== null && (
            <button onClick={() => setCurrentRow(null)} className="ml-0.5 text-gray-300 hover:text-gray-500 dark:hover:text-gray-300" title="Clear tracker">
              <X size={11} />
            </button>
          )}
        </div>

        {selectedColor === null && <span className="text-amber-500">Select a color from the palette to edit cells</span>}
      </div>

      {/* Main editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Grid canvas */}
        <div ref={gridScrollRef} className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-950">
          <div className="inline-block shadow-lg rounded-lg overflow-hidden">
            {result && (
              <GridCanvas
                width={result.width} height={result.height}
                gridData={gridData} colors={colors}
                cellSize={cellSize} selectedColor={selectedColor}
                onEdit={handleCellEdit} highlightRow={canvasHighlightRow}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
          <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <button
              onClick={() => setSidebarTab('colors')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                sidebarTab === 'colors' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Paintbrush size={13} /> Colors
            </button>
            <button
              onClick={() => setSidebarTab('rows')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                sidebarTab === 'rows' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <List size={13} /> Row Guide
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sidebarTab === 'colors' ? (
              <PalettePanel
                colors={colors} selectedColor={selectedColor} onSelect={setSelectedColor}
                gridData={gridData} gridWidth={result?.width ?? 0} gridHeight={result?.height ?? 0}
                yardagePerSkein={yardagePerSkein} onYardageChange={setYardagePerSkein}
                onRemoveColor={handleRemoveColor}
              />
            ) : (
              <WrittenDescription
                width={result?.width ?? 0} height={result?.height ?? 0}
                gridData={gridData} colors={colors}
                currentRow={currentRow} onRowClick={setCurrentRow}
                startFromBottom={startFromBottom} alternateDirection={alternateDirection}
                onStartFromBottomChange={setStartFromBottom} onAlternateChange={setAlternateDirection}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
