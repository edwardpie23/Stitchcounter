import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, ImageIcon, Download, Save, Trash2, ChevronLeft,
  ZoomIn, ZoomOut, Paintbrush, ArrowLeft, Grid3x3, ShoppingBag,
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

const CRAFT_TYPES = [
  { value: 'knitting', label: 'Knitting Colorwork' },
  { value: 'crochet', label: 'Crochet (Pixel/Graphgan)' },
  { value: 'c2c', label: 'Crochet C2C (Corner-to-Corner)' },
  { value: 'cross-stitch', label: 'Cross Stitch' },
]

// ─── Canvas Grid Component ────────────────────────────────────────────────────
function GridCanvas({
  width,
  height,
  gridData,
  colors,
  cellSize,
  selectedColor,
  onEdit,
}: {
  width: number
  height: number
  gridData: number[]
  colors: PaletteColor[]
  cellSize: number
  selectedColor: number | null
  onEdit: (idx: number) => void
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
        const idx = row * width + col
        const colorIdx = gridData[idx] ?? 0
        const color = colors[colorIdx]
        ctx.fillStyle = color?.hex ?? '#ccc'
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
      }
    }

    // Grid lines (only when cells are large enough)
    if (cellSize >= 6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 0.5
      for (let col = 0; col <= width; col++) {
        ctx.beginPath()
        ctx.moveTo(col * cellSize, 0)
        ctx.lineTo(col * cellSize, height * cellSize)
        ctx.stroke()
      }
      for (let row = 0; row <= height; row++) {
        ctx.beginPath()
        ctx.moveTo(0, row * cellSize)
        ctx.lineTo(width * cellSize, row * cellSize)
        ctx.stroke()
      }
    }

    // Every 10 rows/cols - thicker line
    if (cellSize >= 4) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 1
      for (let col = 0; col <= width; col += 10) {
        ctx.beginPath()
        ctx.moveTo(col * cellSize, 0)
        ctx.lineTo(col * cellSize, height * cellSize)
        ctx.stroke()
      }
      for (let row = 0; row <= height; row += 10) {
        ctx.beginPath()
        ctx.moveTo(0, row * cellSize)
        ctx.lineTo(width * cellSize, row * cellSize)
        ctx.stroke()
      }
    }
  }, [width, height, gridData, colors, cellSize])

  useEffect(() => { draw() }, [draw])

  const getCellIdx = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / cellSize)
    const row = Math.floor((e.clientY - rect.top) / cellSize)
    if (col >= 0 && col < width && row >= 0 && row < height) {
      return row * width + col
    }
    return -1
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedColor === null) return
    isDrawing.current = true
    const idx = getCellIdx(e)
    if (idx >= 0) onEdit(idx)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || selectedColor === null) return
    const idx = getCellIdx(e)
    if (idx >= 0) onEdit(idx)
  }

  const handleMouseUp = () => { isDrawing.current = false }

  return (
    <canvas
      ref={canvasRef}
      width={width * cellSize}
      height={height * cellSize}
      style={{ cursor: selectedColor !== null ? 'crosshair' : 'default', display: 'block' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}

// ─── Palette Panel ────────────────────────────────────────────────────────────
function PalettePanel({
  colors,
  selectedColor,
  onSelect,
  gridData,
  gridWidth,
  gridHeight,
  yardagePerSkein,
  onYardageChange,
}: {
  colors: PaletteColor[]
  selectedColor: number | null
  onSelect: (idx: number | null) => void
  gridData: number[]
  gridWidth: number
  gridHeight: number
  yardagePerSkein: number
  onYardageChange: (v: number) => void
}) {
  const totalCells = gridWidth * gridHeight

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Color Palette
        </h3>
        <p className="text-xs text-gray-400 mb-3">Click a color to paint on the grid</p>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {colors.map((c, i) => (
            <button
              key={i}
              onClick={() => onSelect(selectedColor === i ? null : i)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                selectedColor === i
                  ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div
                className="w-6 h-6 rounded-lg flex-shrink-0 border border-gray-200 dark:border-gray-600"
                style={{ backgroundColor: c.hex }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                  DMC {c.dmcCode}
                </p>
                <p className="text-xs text-gray-400 truncate">{c.dmcName}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {c.count} st
              </span>
            </button>
          ))}
        </div>
        {selectedColor !== null && (
          <button
            onClick={() => onSelect(null)}
            className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex items-center gap-1 justify-center"
          >
            <ArrowLeft size={11} /> Deselect brush
          </button>
        )}
      </div>

      {/* Skein Calculator */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center gap-1.5 mb-3">
          <ShoppingBag size={14} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Skein Calculator</h3>
        </div>
        <div className="mb-3">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Yards per skein</label>
          <input
            type="number"
            min="1"
            value={yardagePerSkein}
            onChange={e => onYardageChange(Math.max(1, parseInt(e.target.value) || 200))}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="space-y-1.5">
          {colors.map((c, i) => {
            const pct = totalCells > 0 ? (c.count / totalCells) * 100 : 0
            // Approximate: 1 stitch ≈ 1 yard for worsted (rough estimate)
            const yardsNeeded = Math.ceil(c.count * 1.2)
            const skeins = Math.ceil(yardsNeeded / yardagePerSkein)
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: c.hex }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600 dark:text-gray-400 truncate">DMC {c.dmcCode}</span>
                    <span className="text-gray-500 dark:text-gray-500 ml-1">{skeins} skein{skeins !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: c.hex }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0">{yardsNeeded}y</span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2 italic">
          Estimate based on ~1.2 yds/stitch. Adjust per your gauge.
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ImagePattern() {
  const { token } = useAuth()
  const navigate = useNavigate()

  // Upload / settings state
  const [step, setStep] = useState<'upload' | 'editor' | 'saved'>('upload')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    gridWidth: 50,
    gridHeight: 50,
    numColors: 10,
    craftType: 'knitting',
  })
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

  const loadSavedPatterns = async () => {
    setLoadingPatterns(true)
    try {
      const res = await fetch('/api/image-patterns', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setSavedPatterns(data.patterns || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPatterns(false)
    }
  }

  useEffect(() => { loadSavedPatterns() }, []) // eslint-disable-line

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setConvertError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleConvert = async () => {
    if (!selectedFile) return
    setConverting(true)
    setConvertError('')
    try {
      const form = new FormData()
      form.append('image', selectedFile)
      form.append('width', settings.gridWidth.toString())
      form.append('height', settings.gridHeight.toString())
      form.append('numColors', settings.numColors.toString())

      const res = await fetch('/api/image-patterns/convert', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Conversion failed')
      }

      const data: ConvertResult = await res.json()
      setResult(data)
      setGridData([...data.gridData])
      setColors(data.colors)

      // Auto cell size based on grid
      const maxDim = Math.max(data.width, data.height)
      setCellSize(maxDim <= 30 ? 16 : maxDim <= 60 ? 10 : maxDim <= 100 ? 7 : 5)

      setStep('editor')
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  const handleCellEdit = useCallback((idx: number) => {
    if (selectedColor === null) return
    setGridData(prev => {
      const next = [...prev]
      next[idx] = selectedColor
      return next
    })
  }, [selectedColor])

  const handleSave = async () => {
    if (!result || !patternName.trim()) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/image-patterns', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: patternName,
          width: result.width,
          height: result.height,
          gridData,
          colors,
          craftType: settings.craftType,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveMsg('Saved!')
      await loadSavedPatterns()
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveMsg('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = async () => {
    if (!result) return
    const { jsPDF } = await import('jspdf')

    const cellPx = 4 // points per cell in PDF
    const margin = 20
    const paletteWidth = 80
    const canvasW = result.width * cellPx
    const canvasH = result.height * cellPx
    const pageW = margin * 2 + canvasW + paletteWidth + 10
    const pageH = Math.max(margin * 2 + canvasH + 40, margin * 2 + colors.length * 10 + 40)

    const doc = new jsPDF({
      orientation: canvasW > canvasH ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [pageW, pageH],
    })

    // Title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(patternName, margin, margin)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(
      `${result.width} × ${result.height} stitches · ${colors.length} colors · ${CRAFT_TYPES.find(c => c.value === settings.craftType)?.label ?? settings.craftType}`,
      margin, margin + 14,
    )
    doc.setTextColor(0)

    const gridTop = margin + 26

    // Draw grid cells
    for (let row = 0; row < result.height; row++) {
      for (let col = 0; col < result.width; col++) {
        const idx = row * result.width + col
        const colorIdx = gridData[idx] ?? 0
        const color = colors[colorIdx]
        if (!color) continue

        const hex = color.hex.replace('#', '')
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255

        doc.setFillColor(r * 255, g * 255, b * 255)
        doc.rect(margin + col * cellPx, gridTop + row * cellPx, cellPx, cellPx, 'F')
      }
    }

    // Grid lines every 10
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    for (let col = 0; col <= result.width; col += 10) {
      doc.line(margin + col * cellPx, gridTop, margin + col * cellPx, gridTop + result.height * cellPx)
    }
    for (let row = 0; row <= result.height; row += 10) {
      doc.line(margin, gridTop + row * cellPx, margin + result.width * cellPx, gridTop + row * cellPx)
    }

    // Color legend
    const legendX = margin + canvasW + 10
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Color Legend', legendX, gridTop)
    doc.setFont('helvetica', 'normal')
    colors.forEach((c, i) => {
      const y = gridTop + 12 + i * 10
      const hex = c.hex.replace('#', '')
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      doc.setFillColor(r, g, b)
      doc.rect(legendX, y - 6, 7, 7, 'F')
      doc.setDrawColor(180)
      doc.setLineWidth(0.3)
      doc.rect(legendX, y - 6, 7, 7, 'S')
      doc.setFontSize(7)
      doc.setTextColor(40)
      doc.text(`DMC ${c.dmcCode}`, legendX + 9, y)
      doc.setTextColor(100)
      doc.text(`${c.count} st`, legendX + 9, y + 6)
      doc.setTextColor(0)
    })

    // Row numbers
    doc.setFontSize(5)
    doc.setTextColor(120)
    for (let row = 0; row < result.height; row += 10) {
      doc.text(`${row + 1}`, margin - 8, gridTop + row * cellPx + cellPx)
    }
    for (let col = 0; col < result.width; col += 10) {
      doc.text(`${col + 1}`, margin + col * cellPx, gridTop - 2)
    }

    doc.save(`${patternName.replace(/\s+/g, '_')}_pattern.pdf`)
  }

  const handleDeleteSaved = async (id: string) => {
    if (!confirm('Delete this pattern?')) return
    await fetch(`/api/image-patterns/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setSavedPatterns(p => p.filter(x => x.id !== id))
  }

  const handleLoadSaved = async (id: string) => {
    const res = await fetch(`/api/image-patterns/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    const p = data.pattern
    setResult({ width: p.width, height: p.height, gridData: p.gridData, colors: p.colors })
    setGridData([...p.gridData])
    setColors(p.colors)
    setPatternName(p.name)
    setSettings(s => ({ ...s, craftType: p.craftType }))
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Upload a photo and convert it into a yarn pattern with DMC color matching
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload area */}
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                ${dragOver
                  ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }}
              />
              {previewUrl ? (
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-xl object-contain"
                  />
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
                  <input
                    type="number" min="5" max="200"
                    className="input"
                    value={settings.gridWidth}
                    onChange={e => setSettings(s => ({ ...s, gridWidth: Math.min(200, Math.max(5, parseInt(e.target.value) || 50)) }))}
                  />
                </div>
                <div>
                  <label className="label text-xs">Height (rows)</label>
                  <input
                    type="number" min="5" max="200"
                    className="input"
                    value={settings.gridHeight}
                    onChange={e => setSettings(s => ({ ...s, gridHeight: Math.min(200, Math.max(5, parseInt(e.target.value) || 50)) }))}
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Number of Colors (max 50)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min="2" max="50"
                    className="flex-1"
                    value={settings.numColors}
                    onChange={e => setSettings(s => ({ ...s, numColors: parseInt(e.target.value) }))}
                  />
                  <span className="w-8 text-center font-semibold text-brand-600">{settings.numColors}</span>
                </div>
              </div>

              <div>
                <label className="label text-xs">Craft Type</label>
                <select
                  className="input"
                  value={settings.craftType}
                  onChange={e => setSettings(s => ({ ...s, craftType: e.target.value }))}
                >
                  {CRAFT_TYPES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {convertError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {convertError}
              </div>
            )}

            <button
              onClick={handleConvert}
              disabled={!selectedFile || converting}
              className="btn-primary w-full"
            >
              {converting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Converting…
                </>
              ) : (
                <>
                  <ImageIcon size={16} /> Convert to Pattern
                </>
              )}
            </button>
          </div>
        </div>

        {/* Saved Patterns */}
        {savedPatterns.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Saved Patterns</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPatterns.map(p => (
                <div key={p.id} className="card p-4 group hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.name}</h3>
                    <button
                      onClick={() => handleDeleteSaved(p.id)}
                      className="btn-ghost p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    {p.width} × {p.height} · {p.colors.length} colors · {CRAFT_TYPES.find(c => c.value === p.craftType)?.label ?? p.craftType}
                  </p>
                  {/* Color swatches preview */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.colors.slice(0, 12).map((c, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: c.hex }}
                        title={`DMC ${c.dmcCode} - ${c.dmcName}`}
                      />
                    ))}
                    {p.colors.length > 12 && (
                      <span className="text-xs text-gray-400">+{p.colors.length - 12}</span>
                    )}
                  </div>
                  <button onClick={() => handleLoadSaved(p.id)} className="btn-secondary w-full text-sm py-1.5">
                    Open in Editor
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingPatterns && (
          <div className="mt-6 text-center text-sm text-gray-400">Loading saved patterns…</div>
        )}
      </div>
    )
  }

  // ── Editor Step ──
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3 flex-wrap">
        <button onClick={() => setStep('upload')} className="btn-ghost text-sm">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex-1 min-w-32 max-w-56">
          <input
            className="input text-sm py-1.5"
            value={patternName}
            onChange={e => setPatternName(e.target.value)}
            placeholder="Pattern name"
          />
        </div>

        {selectedColor !== null && (
          <div className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-3 py-1.5 rounded-xl">
            <Paintbrush size={13} />
            Painting: DMC {colors[selectedColor]?.dmcCode}
            <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: colors[selectedColor]?.hex }} />
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setCellSize(s => Math.max(3, s - 2))} className="btn-ghost p-2" title="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-gray-400 w-10 text-center">{cellSize}px</span>
          <button onClick={() => setCellSize(s => Math.min(24, s + 2))} className="btn-ghost p-2" title="Zoom in">
            <ZoomIn size={16} />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-secondary text-sm"
        >
          <Save size={14} />
          {saving ? 'Saving…' : saveMsg || 'Save'}
        </button>

        <button onClick={handleExportPDF} className="btn-primary text-sm">
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* Grid info bar */}
      <div className="flex-shrink-0 px-4 py-1.5 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs text-gray-400">
        <span>{result?.width} × {result?.height} stitches</span>
        <span>{colors.length} colors</span>
        <span>{CRAFT_TYPES.find(c => c.value === settings.craftType)?.label}</span>
        {selectedColor === null && <span className="text-amber-500">Select a color from the palette to edit cells</span>}
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Grid canvas */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-950">
          <div className="inline-block shadow-lg rounded-lg overflow-hidden">
            {result && (
              <GridCanvas
                width={result.width}
                height={result.height}
                gridData={gridData}
                colors={colors}
                cellSize={cellSize}
                selectedColor={selectedColor}
                onEdit={handleCellEdit}
              />
            )}
          </div>
        </div>

        {/* Palette sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto p-4">
          <PalettePanel
            colors={colors}
            selectedColor={selectedColor}
            onSelect={setSelectedColor}
            gridData={gridData}
            gridWidth={result?.width ?? 0}
            gridHeight={result?.height ?? 0}
            yardagePerSkein={yardagePerSkein}
            onYardageChange={setYardagePerSkein}
          />
        </div>
      </div>
    </div>
  )
}
