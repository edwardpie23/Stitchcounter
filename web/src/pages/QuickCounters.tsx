import React, { useState, useRef, useCallback } from 'react'
import { Plus, Minus, RotateCcw, Hash, Trash2, Edit2, Check, X } from 'lucide-react'

interface QuickCount {
  id: string
  name: string
  value: number
}

function CounterWidget({
  counter,
  onUpdate,
  onDelete,
  onRename,
}: {
  counter: QuickCount
  onUpdate: (id: string, value: number) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(counter.name)
  const [pressing, setPressing] = useState<'inc' | 'dec' | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const inc = useCallback((amount = 1) => {
    onUpdate(counter.id, counter.value + amount)
  }, [counter.id, counter.value, onUpdate])

  const dec = useCallback((amount = 1) => {
    onUpdate(counter.id, Math.max(0, counter.value - amount))
  }, [counter.id, counter.value, onUpdate])

  const handleIncStart = () => {
    inc()
    setPressing('inc')
    longPressRef.current = setTimeout(() => inc(10), 700)
  }
  const handleDecStart = () => {
    dec()
    setPressing('dec')
    longPressRef.current = setTimeout(() => dec(10), 700)
  }
  const handleEnd = () => {
    setPressing(null)
    if (longPressRef.current) clearTimeout(longPressRef.current)
  }

  const saveName = () => {
    if (nameVal.trim()) onRename(counter.id, nameVal.trim())
    setEditingName(false)
  }

  return (
    <div className="card p-6">
      {/* Name */}
      <div className="flex items-center justify-between mb-5">
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              className="input text-sm py-1 flex-1"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') { setNameVal(counter.name); setEditingName(false) }
              }}
              autoFocus
            />
            <button onClick={saveName} className="btn-ghost p-1 text-green-500"><Check size={16} /></button>
            <button onClick={() => { setNameVal(counter.name); setEditingName(false) }} className="btn-ghost p-1 text-red-400"><X size={16} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{counter.name}</h3>
            <button onClick={() => setEditingName(true)} className="btn-ghost p-1 text-gray-400 flex-shrink-0"><Edit2 size={13} /></button>
          </div>
        )}
        <button
          onClick={() => onDelete(counter.id)}
          className="btn-ghost p-1.5 text-red-400 hover:text-red-600 flex-shrink-0 ml-2"
          aria-label="Delete counter"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          onMouseDown={handleDecStart}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleDecStart}
          onTouchEnd={handleEnd}
          disabled={counter.value === 0}
          className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all select-none
            bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
            text-gray-700 dark:text-gray-200 shadow-sm
            disabled:opacity-40 disabled:cursor-not-allowed
            ${pressing === 'dec' ? 'scale-95 shadow-none' : 'scale-100'}`}
          aria-label="Decrease"
        >
          <Minus size={28} strokeWidth={2.5} />
        </button>

        <div className="text-center flex-1">
          <div className="text-6xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
            {counter.value}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Hold for ±10</p>
        </div>

        <button
          onMouseDown={handleIncStart}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleIncStart}
          onTouchEnd={handleEnd}
          className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all select-none
            bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-200 dark:shadow-brand-900/40
            ${pressing === 'inc' ? 'scale-95 shadow-none' : 'scale-100'}`}
          aria-label="Increase"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>

      <button
        onClick={() => onUpdate(counter.id, 0)}
        className="w-full btn-secondary text-sm py-2 gap-2"
      >
        <RotateCcw size={14} /> Reset to 0
      </button>
    </div>
  )
}

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

function loadCounters(): QuickCount[] {
  try {
    const saved = localStorage.getItem('sc_quick_counters')
    return saved ? JSON.parse(saved) : [{ id: generateId(), name: 'Counter 1', value: 0 }]
  } catch {
    return [{ id: generateId(), name: 'Counter 1', value: 0 }]
  }
}

function saveCounters(counters: QuickCount[]) {
  localStorage.setItem('sc_quick_counters', JSON.stringify(counters))
}

export default function QuickCounters() {
  const [counters, setCounters] = useState<QuickCount[]>(loadCounters)

  const updateState = (next: QuickCount[]) => {
    setCounters(next)
    saveCounters(next)
  }

  const handleUpdate = (id: string, value: number) => {
    updateState(counters.map(c => c.id === id ? { ...c, value } : c))
  }

  const handleDelete = (id: string) => {
    if (counters.length === 1) {
      // Reset instead of delete if it's the last one
      updateState(counters.map(c => c.id === id ? { ...c, value: 0 } : c))
      return
    }
    updateState(counters.filter(c => c.id !== id))
  }

  const handleRename = (id: string, name: string) => {
    updateState(counters.map(c => c.id === id ? { ...c, name } : c))
  }

  const addCounter = () => {
    const next = [...counters, { id: generateId(), name: `Counter ${counters.length + 1}`, value: 0 }]
    updateState(next)
  }

  const resetAll = () => {
    if (!confirm('Reset all counters to 0?')) return
    updateState(counters.map(c => ({ ...c, value: 0 })))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Hash className="text-brand-500" size={24} />
            Quick Counters
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Persistent counters saved in your browser. For project-specific counters, use Projects.
          </p>
        </div>
        <div className="flex gap-2">
          {counters.length > 1 && (
            <button onClick={resetAll} className="btn-secondary text-sm">
              <RotateCcw size={14} /> Reset All
            </button>
          )}
          <button onClick={addCounter} className="btn-primary">
            <Plus size={16} /> Add Counter
          </button>
        </div>
      </div>

      <div className={`grid gap-4 ${counters.length === 1 ? 'max-w-sm mx-auto' : 'sm:grid-cols-2'}`}>
        {counters.map(counter => (
          <CounterWidget
            key={counter.id}
            counter={counter}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        ))}
      </div>
    </div>
  )
}
