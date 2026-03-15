import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Minus, RotateCcw, Trash2, Edit2, Check, X,
  Target, ChevronDown, Save
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import type { Project, Counter } from '../types'

// ---- Counter Component ----
function CounterCard({
  counter,
  onUpdate,
  onDelete,
}: {
  counter: Counter
  onUpdate: (id: string, data: Partial<Counter>) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [editingTarget, setEditingTarget] = useState(false)
  const [nameVal, setNameVal] = useState(counter.name)
  const [targetVal, setTargetVal] = useState(counter.target?.toString() ?? '')
  const [pressing, setPressing] = useState<'inc' | 'dec' | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const inc = useCallback(async (amount = 1) => {
    await onUpdate(counter.id, { value: counter.value + amount })
  }, [counter.id, counter.value, onUpdate])

  const dec = useCallback(async (amount = 1) => {
    if (counter.value - amount < 0) return
    await onUpdate(counter.id, { value: counter.value - amount })
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

  const saveName = async () => {
    if (nameVal.trim()) {
      await onUpdate(counter.id, { name: nameVal.trim() })
    }
    setEditingName(false)
  }

  const saveTarget = async () => {
    const t = targetVal === '' ? null : parseInt(targetVal, 10)
    await onUpdate(counter.id, { target: isNaN(t as number) ? null : t })
    setEditingTarget(false)
  }

  const pct = counter.target
    ? Math.min(100, Math.round((counter.value / counter.target) * 100))
    : null

  return (
    <div className="card p-5">
      {/* Name row */}
      <div className="flex items-center justify-between mb-4">
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              className="input text-sm py-1 flex-1"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              autoFocus
            />
            <button onClick={saveName} className="btn-ghost p-1 text-green-500"><Check size={16} /></button>
            <button onClick={() => setEditingName(false)} className="btn-ghost p-1 text-red-400"><X size={16} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{counter.name}</h3>
            <button onClick={() => setEditingName(true)} className="btn-ghost p-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
              <Edit2 size={12} />
            </button>
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

      {/* Counter controls */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          onMouseDown={handleDecStart}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleDecStart}
          onTouchEnd={handleEnd}
          disabled={counter.value === 0}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all select-none
            bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
            text-gray-700 dark:text-gray-200 shadow-sm
            disabled:opacity-40 disabled:cursor-not-allowed
            ${pressing === 'dec' ? 'scale-95 shadow-none' : 'scale-100'}`}
          aria-label="Decrease"
        >
          <Minus size={22} strokeWidth={2.5} />
        </button>

        <div className="text-center flex-1">
          <div className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
            {counter.value}
          </div>
          {counter.target && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">of {counter.target}</div>
          )}
        </div>

        <button
          onMouseDown={handleIncStart}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleIncStart}
          onTouchEnd={handleEnd}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all select-none
            bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-200 dark:shadow-brand-900/40
            ${pressing === 'inc' ? 'scale-95 shadow-none' : 'scale-100'}`}
          aria-label="Increase"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Target & reset */}
      <div className="flex items-center justify-between pt-1">
        {editingTarget ? (
          <div className="flex items-center gap-2">
            <Target size={14} className="text-gray-400" />
            <input
              className="input text-xs py-1 w-24"
              type="number"
              min="1"
              placeholder="Target rows"
              value={targetVal}
              onChange={e => setTargetVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditingTarget(false) }}
              autoFocus
            />
            <button onClick={saveTarget} className="btn-ghost p-1 text-green-500"><Check size={14} /></button>
            <button onClick={() => setEditingTarget(false)} className="btn-ghost p-1 text-red-400"><X size={14} /></button>
          </div>
        ) : (
          <button
            onClick={() => setEditingTarget(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-500 transition-colors"
          >
            <Target size={13} />
            {counter.target ? `Target: ${counter.target}` : 'Set target'}
          </button>
        )}

        <button
          onClick={() => onUpdate(counter.id, { value: 0 })}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </div>
  )
}

// ---- Add Counter Modal ----
function AddCounterModal({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, target?: number) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onAdd(name.trim(), target ? parseInt(target, 10) : undefined)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Counter Name *</label>
        <input
          className="input"
          placeholder="Main body, Left sleeve…"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div>
        <label className="label">Target (optional)</label>
        <input
          className="input"
          type="number"
          min="1"
          placeholder="e.g. 120 rows"
          value={target}
          onChange={e => setTarget(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Adding…' : 'Add Counter'}
        </button>
      </div>
    </form>
  )
}

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'hibernating', label: 'Hibernating' },
  { value: 'frogged', label: 'Frogged' },
]

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const api = useApi()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddCounter, setShowAddCounter] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get<{ project: Project }>(`/projects/${id}`)
      .then(d => {
        setProject(d.project)
        setNotes(d.project.notes ?? '')
      })
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const updateCounter = useCallback(async (counterId: string, data: Partial<Counter>) => {
    const res = await api.put<{ counter: Counter }>(`/counters/${counterId}`, data)
    setProject(p => p ? {
      ...p,
      counters: p.counters.map(c => c.id === counterId ? res.counter : c)
    } : p)
  }, [api])

  const deleteCounter = useCallback(async (counterId: string) => {
    if (!confirm('Remove this counter?')) return
    await api.del(`/counters/${counterId}`)
    setProject(p => p ? {
      ...p,
      counters: p.counters.filter(c => c.id !== counterId)
    } : p)
  }, [api])

  const addCounter = async (name: string, target?: number) => {
    const res = await api.post<{ counter: Counter }>(`/projects/${id}/counters`, { name, target })
    setProject(p => p ? { ...p, counters: [...p.counters, res.counter] } : p)
    setShowAddCounter(false)
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      const res = await api.put<{ project: Project }>(`/projects/${id}`, { notes })
      setProject(res.project)
      setEditingNotes(false)
    } finally {
      setSavingNotes(false)
    }
  }

  const setStatus = async (status: string) => {
    const res = await api.put<{ project: Project }>(`/projects/${id}`, { status })
    setProject(res.project)
    setEditingStatus(false)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {[1, 2].map(i => <div key={i} className="card h-48" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!project) return null

  const statusStyles: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    frogged: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    hibernating: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/projects" className="btn-ghost rounded-xl p-2">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {editingStatus ? (
              <div className="flex gap-1">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className={`badge cursor-pointer hover:opacity-80 transition-opacity ${statusStyles[s.value]}`}
                  >
                    {s.label}
                  </button>
                ))}
                <button onClick={() => setEditingStatus(false)} className="btn-ghost p-1 ml-1"><X size={14} /></button>
              </div>
            ) : (
              <button
                onClick={() => setEditingStatus(true)}
                className={`badge cursor-pointer hover:opacity-80 transition-opacity ${statusStyles[project.status]}`}
              >
                {project.status}
              </button>
            )}
            {project.pattern && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                · Pattern: {project.pattern.name}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowInfo(v => !v)}
          className="btn-ghost rounded-xl p-2 flex-shrink-0"
          aria-label="Toggle project info"
        >
          <ChevronDown size={18} className={`transition-transform ${showInfo ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Collapsible project info */}
      {showInfo && (
        <div className="card p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {project.yarnBrand && <div><span className="text-gray-400 block text-xs">Yarn</span>{project.yarnBrand}</div>}
          {project.yarnWeight && <div><span className="text-gray-400 block text-xs">Weight</span>{project.yarnWeight}</div>}
          {project.yarnColor && <div><span className="text-gray-400 block text-xs">Color</span>{project.yarnColor}</div>}
          {project.needleSize && <div><span className="text-gray-400 block text-xs">Needles</span>{project.needleSize}</div>}
          {project.description && (
            <div className="col-span-2 sm:col-span-4">
              <span className="text-gray-400 block text-xs">Description</span>
              {project.description}
            </div>
          )}
        </div>
      )}

      {/* Counters */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Counters ({project.counters.length})
          </h2>
          <button onClick={() => setShowAddCounter(true)} className="btn-primary text-sm">
            <Plus size={14} /> Add Counter
          </button>
        </div>

        {project.counters.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No counters yet. Add one to start tracking!</p>
            <button onClick={() => setShowAddCounter(true)} className="btn-primary">
              <Plus size={16} /> Add Counter
            </button>
          </div>
        ) : (
          <div className="group grid sm:grid-cols-2 gap-4">
            {project.counters.map(counter => (
              <CounterCard
                key={counter.id}
                counter={counter}
                onUpdate={updateCounter}
                onDelete={deleteCounter}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Counter inline modal */}
      {showAddCounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddCounter(false)} />
          <div className="relative w-full max-w-sm card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Counter</h2>
              <button onClick={() => setShowAddCounter(false)} className="btn-ghost rounded-lg p-1.5 -mr-1"><X size={18} /></button>
            </div>
            <AddCounterModal onAdd={addCounter} onClose={() => setShowAddCounter(false)} />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Notes</h2>
          {editingNotes ? (
            <div className="flex gap-2">
              <button onClick={saveNotes} disabled={savingNotes} className="btn-primary text-xs py-1.5">
                <Save size={13} /> {savingNotes ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditingNotes(false); setNotes(project.notes ?? '') }} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingNotes(true)} className="btn-ghost text-xs py-1.5">
              <Edit2 size={13} /> Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <textarea
            className="input resize-none w-full min-h-[120px]"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this project — yarn substitutions, modifications, gauge…"
            autoFocus
          />
        ) : (
          <div className="min-h-[80px]">
            {project.notes ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{project.notes}</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-600">No notes yet. Click Edit to add some.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
