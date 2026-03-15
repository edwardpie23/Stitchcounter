import React, { useState, useRef } from 'react'
import { Plus, Minus, RotateCcw, Target } from 'lucide-react'

interface CounterWidgetProps {
  id: string
  name: string
  value: number
  target: number | null
  onUpdate: (id: string, value: number) => void
  onRename?: (id: string, name: string) => void
  onDelete?: (id: string) => void
  onSetTarget?: (id: string, target: number | null) => void
}

export default function CounterWidget({
  id,
  name,
  value,
  target,
  onUpdate,
  onRename,
  onDelete,
  onSetTarget,
}: CounterWidgetProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(name)
  const [showTargetInput, setShowTargetInput] = useState(false)
  const [targetVal, setTargetVal] = useState(target?.toString() ?? '')
  const [pressing, setPressing] = useState<'inc' | 'dec' | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const progress = target ? Math.min((value / target) * 100, 100) : 0
  const done = target !== null && value >= target

  function handleInc() {
    onUpdate(id, value + 1)
  }

  function handleDec() {
    if (value > 0) onUpdate(id, value - 1)
  }

  function handleLongPressStart(type: 'inc' | 'dec') {
    setPressing(type)
    longPressTimer.current = setTimeout(() => {
      if (type === 'inc') onUpdate(id, value + 10)
      else onUpdate(id, Math.max(0, value - 10))
    }, 500)
  }

  function handleLongPressEnd() {
    setPressing(null)
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  function submitName() {
    setEditingName(false)
    if (nameVal.trim() && onRename) onRename(id, nameVal.trim())
  }

  function submitTarget() {
    setShowTargetInput(false)
    const n = parseInt(targetVal)
    if (onSetTarget) onSetTarget(id, isNaN(n) || n <= 0 ? null : n)
  }

  return (
    <div className={`card p-5 flex flex-col gap-4 ${done ? 'ring-2 ring-green-400 dark:ring-green-500' : ''}`}>
      {/* Name */}
      <div className="flex items-center justify-between">
        {editingName ? (
          <input
            className="input text-sm font-semibold flex-1 mr-2"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={submitName}
            onKeyDown={e => e.key === 'Enter' && submitName()}
            autoFocus
          />
        ) : (
          <button
            className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-left truncate hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            onClick={() => setEditingName(true)}
          >
            {name}
          </button>
        )}
        <div className="flex items-center gap-1">
          {done && (
            <span className="badge bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 mr-1">
              Done!
            </span>
          )}
          <button
            onClick={() => setShowTargetInput(v => !v)}
            className="btn-ghost rounded-lg p-1.5 text-gray-400"
            title="Set target"
          >
            <Target size={14} />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="btn-ghost rounded-lg p-1.5 text-gray-400 hover:text-red-500"
              title="Delete counter"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Target input */}
      {showTargetInput && (
        <div className="flex gap-2">
          <input
            type="number"
            className="input text-sm"
            placeholder="Target rows (blank = none)"
            value={targetVal}
            onChange={e => setTargetVal(e.target.value)}
            min={1}
          />
          <button className="btn-primary text-xs px-3" onClick={submitTarget}>
            Set
          </button>
        </div>
      )}

      {/* Progress bar */}
      {target !== null && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
            <span>{value} / {target}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Counter buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          className={`flex-1 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 text-gray-700 dark:text-gray-200 text-2xl font-light transition-all duration-100 flex items-center justify-center ${pressing === 'dec' ? 'scale-95 bg-gray-200 dark:bg-gray-700' : ''}`}
          onClick={handleDec}
          onMouseDown={() => handleLongPressStart('dec')}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={() => handleLongPressStart('dec')}
          onTouchEnd={handleLongPressEnd}
          aria-label="Decrease"
        >
          <Minus size={24} />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
            {value}
          </span>
          {target === null && (
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">rows</span>
          )}
        </div>

        <button
          className={`flex-1 h-16 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-2xl font-light transition-all duration-100 flex items-center justify-center shadow-md shadow-brand-200 dark:shadow-brand-900/30 ${pressing === 'inc' ? 'scale-95 bg-brand-700' : ''}`}
          onClick={handleInc}
          onMouseDown={() => handleLongPressStart('inc')}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={() => handleLongPressStart('inc')}
          onTouchEnd={handleLongPressEnd}
          aria-label="Increase"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Reset */}
      <button
        className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
        onClick={() => onUpdate(id, 0)}
      >
        <RotateCcw size={12} />
        Reset
      </button>
    </div>
  )
}
