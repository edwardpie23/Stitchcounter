import React, { useState, useEffect } from 'react'
import { Layers, Plus, Trash2, Search } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'
import type { StashEntry } from '../types'

const YARN_WEIGHTS: StashEntry['weight'][] = [
  'lace', 'fingering', 'sport', 'dk', 'worsted', 'aran', 'bulky', 'super-bulky',
]

const WEIGHT_COLORS: Record<string, string> = {
  lace: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  fingering: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  sport: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  dk: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  worsted: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  aran: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  bulky: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'super-bulky': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
}

const defaultForm = {
  brand: '',
  name: '',
  weight: 'worsted' as StashEntry['weight'],
  color: '',
  yardage: '',
  quantity: '1',
  notes: '',
}

export default function Stash() {
  const api = useApi()
  const [stash, setStash] = useState<StashEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [weightFilter, setWeightFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ stash: StashEntry[] }>('/stash')
      .then(d => setStash(d.stash))
      .catch(console.error)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.brand.trim() || !form.name.trim()) {
      setError('Brand and yarn name are required')
      return
    }
    setSubmitting(true)
    try {
      const { entry } = await api.post<{ entry: StashEntry }>('/stash', {
        brand: form.brand.trim(),
        name: form.name.trim(),
        weight: form.weight,
        color: form.color || null,
        yardage: form.yardage ? parseInt(form.yardage) : null,
        quantity: parseInt(form.quantity) || 1,
        notes: form.notes || null,
      })
      setStash(s => [entry, ...s])
      setShowAdd(false)
      setForm(defaultForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add yarn')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this yarn from your stash?')) return
    setDeletingId(id)
    try {
      await api.del(`/stash/${id}`)
      setStash(s => s.filter(e => e.id !== id))
    } catch {
      alert('Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = stash.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      e.brand.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      (e.color?.toLowerCase().includes(q) ?? false)
    const matchWeight = weightFilter === 'all' || e.weight === weightFilter
    return matchSearch && matchWeight
  })

  const totalYardage = stash.reduce((sum, e) => sum + (e.yardage ?? 0) * e.quantity, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yarn Stash</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {stash.length} yarn{stash.length !== 1 ? 's' : ''}
            {totalYardage > 0 && ` · ${totalYardage.toLocaleString()} yards total`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add yarn
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by brand, name, color…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              weightFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
            }`}
            onClick={() => setWeightFilter('all')}
          >
            All
          </button>
          {YARN_WEIGHTS.map(w => (
            <button
              key={w}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                weightFilter === w ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => setWeightFilter(w)}
            >
              {w.charAt(0).toUpperCase() + w.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          {stash.length === 0 ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your stash is empty</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Log your yarn inventory to keep track of what you have.
              </p>
              <button className="btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={16} />
                Add your first yarn
              </button>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No yarn matches your search</p>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(entry => (
            <div key={entry.id} className="card p-5 flex flex-col gap-3 group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{entry.brand}</p>
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{entry.name}</h3>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`badge ${WEIGHT_COLORS[entry.weight] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                  {entry.weight}
                </span>
                {entry.color && (
                  <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    🎨 {entry.color}
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                {entry.yardage && (
                  <p>📏 {(entry.yardage * entry.quantity).toLocaleString()} yards
                    {entry.quantity > 1 && ` (${entry.quantity} × ${entry.yardage})`}
                  </p>
                )}
                {entry.quantity > 1 && !entry.yardage && (
                  <p>Qty: {entry.quantity}</p>
                )}
              </div>

              {entry.notes && (
                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 italic">
                  {entry.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setError('') }} title="Add Yarn" size="md">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Brand *</label>
              <input
                className="input"
                placeholder="Malabrigo"
                value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Yarn name *</label>
              <input
                className="input"
                placeholder="Rios"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Weight</label>
              <select
                className="input"
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value as StashEntry['weight'] }))}
              >
                {YARN_WEIGHTS.map(w => (
                  <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Color</label>
              <input
                className="input"
                placeholder="Peacock"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Yardage per skein</label>
              <input
                type="number"
                className="input"
                placeholder="210"
                value={form.yardage}
                onChange={e => setForm(f => ({ ...f, yardage: e.target.value }))}
                min={1}
              />
            </div>
            <div>
              <label className="label">Quantity (skeins)</label>
              <input
                type="number"
                className="input"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                min={1}
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Purchased from… dye lot… intended project…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add to stash'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
