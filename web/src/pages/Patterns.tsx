import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, ExternalLink, Tag } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'
import type { Pattern } from '../types'

interface CreateForm {
  name: string
  sourceUrl: string
  notes: string
  tags: string
  imageUrl: string
}

const defaultForm: CreateForm = { name: '', sourceUrl: '', notes: '', tags: '', imageUrl: '' }

export default function Patterns() {
  const api = useApi()
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Pattern | null>(null)

  useEffect(() => {
    api.get<{ patterns: Pattern[] }>('/patterns')
      .then(d => setPatterns(d.patterns))
      .catch(console.error)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Pattern name is required'); return }
    setSubmitting(true)
    try {
      const res = await api.post<{ pattern: Pattern }>('/patterns', form)
      setPatterns(p => [res.pattern, ...p])
      setShowCreate(false)
      setForm(defaultForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pattern')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pattern?')) return
    setDeletingId(id)
    try {
      await api.del(`/patterns/${id}`)
      setPatterns(p => p.filter(pt => pt.id !== id))
      if (selected?.id === id) setSelected(null)
    } finally {
      setDeletingId(null)
    }
  }

  const f = (field: keyof CreateForm) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value })),
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patterns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {patterns.length} pattern{patterns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Add Pattern
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 h-36 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : patterns.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No patterns yet</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Save your favorite patterns and link them to projects.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Add your first pattern
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patterns.map(pattern => (
            <div
              key={pattern.id}
              className="card p-5 flex flex-col hover:shadow-md transition-shadow group cursor-pointer"
              onClick={() => setSelected(pattern)}
            >
              {/* Thumbnail placeholder */}
              <div className="w-full h-28 rounded-xl bg-gradient-to-br from-brand-50 to-purple-100 dark:from-brand-950/30 dark:to-purple-900/20 flex items-center justify-center mb-4 flex-shrink-0">
                {pattern.imageUrl ? (
                  <img
                    src={pattern.imageUrl}
                    alt={pattern.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <BookOpen size={32} className="text-brand-300 dark:text-brand-700" />
                )}
              </div>

              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 flex-1">
                  {pattern.name}
                </h3>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(pattern.id) }}
                  disabled={deletingId === pattern.id}
                  className="btn-ghost p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all flex-shrink-0"
                  aria-label="Delete pattern"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {pattern.tags && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {pattern.tags.split(',').map((t, i) => (
                    <span key={i} className="badge bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 text-xs">
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}

              {pattern.sourceUrl && (
                <a
                  href={pattern.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline mt-auto"
                >
                  <ExternalLink size={11} /> View pattern
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(defaultForm); setError('') }} title="Add Pattern">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Pattern Name *</label>
            <input className="input" placeholder="Basic Sock Pattern" {...f('name')} required />
          </div>
          <div>
            <label className="label">Source URL</label>
            <input className="input" type="url" placeholder="https://ravelry.com/patterns/…" {...f('sourceUrl')} />
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input className="input" placeholder="sock, colorwork, lace" {...f('tags')} />
          </div>
          <div>
            <label className="label">Image URL</label>
            <input className="input" type="url" placeholder="https://example.com/image.jpg" {...f('imageUrl')} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Notes, modifications, sizing notes…"
              {...f('notes')}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : 'Save Pattern'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pattern detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''} size="lg">
        {selected && (
          <div className="space-y-4">
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt={selected.name} className="w-full h-48 object-cover rounded-xl" />
            )}
            {selected.tags && (
              <div className="flex flex-wrap gap-1">
                {selected.tags.split(',').map((t, i) => (
                  <span key={i} className="badge bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400">
                    <Tag size={10} className="mr-1" />{t.trim()}
                  </span>
                ))}
              </div>
            )}
            {selected.sourceUrl && (
              <a
                href={selected.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full justify-center text-sm"
              >
                <ExternalLink size={14} /> Open Pattern Source
              </a>
            )}
            {selected.notes && (
              <div>
                <p className="label mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selected.notes}</p>
              </div>
            )}
            <p className="text-xs text-gray-400">Added {new Date(selected.createdAt).toLocaleDateString()}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
