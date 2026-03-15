import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, Layers, Filter } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'
import type { StashEntry } from '../types'

const YARN_WEIGHTS = ['lace', 'fingering', 'sport', 'DK', 'worsted', 'aran', 'bulky', 'super-bulky']

const weightColors: Record<string, string> = {
  lace: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  fingering: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  sport: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  DK: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  worsted: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  aran: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  bulky: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  'super-bulky': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

interface StashForm {
  brand: string
  name: string
  weight: string
  color: string
  yardage: string
  quantity: string
  notes: string
}

const defaultForm: StashForm = {
  brand: '',
  name: '',
  weight: 'worsted',
  color: '',
  yardage: '',
  quantity: '1',
  notes: '',
}

function StashCard({
  entry,
  onDelete,
  onUpdate,
}: {
  entry: StashEntry
  onDelete: (id: string) => void
  onUpdate: (id: string, data: Partial<StashEntry>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<StashForm>({
    brand: entry.brand,
    name: entry.name,
    weight: entry.weight,
    color: entry.color ?? '',
    yardage: entry.yardage?.toString() ?? '',
    quantity: entry.quantity.toString(),
    notes: entry.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(entry.id, {
        brand: form.brand,
        name: form.name,
        weight: form.weight as StashEntry['weight'],
        color: form.color || undefined,
        yardage: form.yardage ? parseInt(form.yardage, 10) : undefined,
        quantity: parseInt(form.quantity, 10) || 1,
        notes: form.notes || undefined,
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="card p-4 border-2 border-brand-300 dark:border-brand-700">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Brand *</label>
              <input className="input text-sm py-1.5" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Yarn Name *</label>
              <input className="input text-sm py-1.5" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Weight</label>
              <select className="input text-sm py-1.5" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}>
                {YARN_WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Color</label>
              <input className="input text-sm py-1.5" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Yardage</label>
              <input className="input text-sm py-1.5" type="number" value={form.yardage} onChange={e => setForm(p => ({ ...p, yardage: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Quantity (skeins)</label>
              <input className="input text-sm py-1.5" type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5">
              <Check size={12} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4 flex items-start gap-3 group hover:shadow-md transition-shadow">
      {/* Color swatch */}
      <div
        className="w-10 h-10 rounded-xl flex-shrink-0 border border-gray-200 dark:border-gray-700"
        style={{
          backgroundColor: entry.color
            ? entry.color.startsWith('#') ? entry.color : undefined
            : undefined,
          background: !entry.color || !entry.color.startsWith('#')
            ? 'linear-gradient(135deg, #f3d0fe, #c4b5fd)'
            : undefined,
        }}
        title={entry.color ?? 'No color specified'}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {entry.brand} — {entry.name}
            </p>
            {entry.color && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{entry.color}</p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)} className="btn-ghost p-1"><Edit2 size={13} /></button>
            <button onClick={() => onDelete(entry.id)} className="btn-ghost p-1 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={`badge text-xs ${weightColors[entry.weight] ?? 'bg-gray-100 text-gray-600'}`}>
            {entry.weight}
          </span>
          {entry.yardage && (
            <span className="text-xs text-gray-400">{entry.yardage.toLocaleString()} yds</span>
          )}
          {entry.quantity > 1 && (
            <span className="text-xs text-gray-400">×{entry.quantity} skeins</span>
          )}
        </div>
        {entry.notes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{entry.notes}</p>
        )}
      </div>
    </div>
  )
}

export default function Stash() {
  const api = useApi()
  const [stash, setStash] = useState<StashEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<StashForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [filterWeight, setFilterWeight] = useState('')
  const [filterColor, setFilterColor] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const load = () => {
    const params = new URLSearchParams()
    if (filterWeight) params.set('weight', filterWeight)
    if (filterColor) params.set('color', filterColor)
    api.get<{ stash: StashEntry[] }>(`/stash${params.toString() ? '?' + params : ''}`)
      .then(d => setStash(d.stash))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterWeight, filterColor]) // eslint-disable-line

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.brand.trim() || !form.name.trim() || !form.weight) {
      setError('Brand, name, and weight are required')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post<{ entry: StashEntry }>('/stash', {
        brand: form.brand,
        name: form.name,
        weight: form.weight,
        color: form.color || undefined,
        yardage: form.yardage ? parseInt(form.yardage, 10) : undefined,
        quantity: parseInt(form.quantity, 10) || 1,
        notes: form.notes || undefined,
      })
      setStash(s => [res.entry, ...s])
      setShowAdd(false)
      setForm(defaultForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add yarn')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this yarn from stash?')) return
    await api.del(`/stash/${id}`)
    setStash(s => s.filter(e => e.id !== id))
  }

  const handleUpdate = async (id: string, data: Partial<StashEntry>) => {
    const res = await api.put<{ entry: StashEntry }>(`/stash/${id}`, data)
    setStash(s => s.map(e => e.id === id ? res.entry : e))
  }

  const totalYardage = stash.reduce((s, e) => s + (e.yardage ?? 0) * e.quantity, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yarn Stash</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {stash.length} yarn{stash.length !== 1 ? 's' : ''}
            {totalYardage > 0 && ` · ${totalYardage.toLocaleString()} total yards`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`btn-secondary ${showFilters ? 'border-brand-400 text-brand-600' : ''}`}
          >
            <Filter size={15} /> Filter
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add Yarn
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">Filter by Weight</label>
            <select className="input text-sm py-1.5" value={filterWeight} onChange={e => setFilterWeight(e.target.value)}>
              <option value="">All weights</option>
              {YARN_WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Filter by Color</label>
            <input className="input text-sm py-1.5" placeholder="e.g. blue" value={filterColor} onChange={e => setFilterColor(e.target.value)} />
          </div>
          <button
            onClick={() => { setFilterWeight(''); setFilterColor('') }}
            className="btn-ghost text-sm py-1.5"
          >
            Clear filters
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4 h-16 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : stash.length === 0 ? (
        <div className="text-center py-16">
          <Layers size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {filterWeight || filterColor ? 'No yarn matches your filters' : 'Your stash is empty'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            {filterWeight || filterColor ? 'Try different filters.' : 'Start adding your yarn collection.'}
          </p>
          {!filterWeight && !filterColor && (
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> Add Yarn
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {stash.map(entry => (
            <StashCard key={entry.id} entry={entry} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      {/* Add Yarn Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(defaultForm); setError('') }} title="Add Yarn to Stash">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Brand *</label>
              <input className="input" placeholder="Malabrigo" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Yarn Name *</label>
              <input className="input" placeholder="Rios" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Weight *</label>
              <select className="input" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} required>
                {YARN_WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Color</label>
              <input className="input" placeholder="Peacock (#008080)" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Yardage per skein</label>
              <input className="input" type="number" min="1" placeholder="400" value={form.yardage} onChange={e => setForm(p => ({ ...p, yardage: e.target.value }))} />
            </div>
            <div>
              <label className="label">Quantity (skeins)</label>
              <input className="input" type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Purchased from, project ideas…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Adding…' : 'Add to Stash'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
