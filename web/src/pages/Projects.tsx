import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FolderOpen, ChevronRight, Trash2 } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'
import type { Project, Pattern } from '../types'

const YARN_WEIGHTS = ['lace', 'fingering', 'sport', 'DK', 'worsted', 'aran', 'bulky', 'super-bulky']
const STATUSES = ['active', 'completed', 'hibernating', 'frogged']

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    frogged: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    hibernating: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  }
  return <span className={`badge ${styles[status] ?? styles.active}`}>{status}</span>
}

function ProgressBar({ value, target }: { value: number; target: number | null }) {
  if (!target) return null
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
        <span>{value} / {target}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface CreateProjectForm {
  name: string
  description: string
  yarnBrand: string
  yarnWeight: string
  yarnColor: string
  needleSize: string
  patternId: string
}

const defaultForm: CreateProjectForm = {
  name: '',
  description: '',
  yarnBrand: '',
  yarnWeight: '',
  yarnColor: '',
  needleSize: '',
  patternId: '',
}

export default function Projects() {
  const api = useApi()
  const [projects, setProjects] = useState<Project[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateProjectForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = () => {
    api.get<{ projects: Project[] }>('/projects')
      .then(d => setProjects(d.projects))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get<{ patterns: Pattern[] }>('/patterns')
      .then(d => setPatterns(d.patterns))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Project name is required'); return }
    setSubmitting(true)
    try {
      const res = await api.post<{ project: Project }>('/projects', {
        ...form,
        patternId: form.patternId || undefined,
      })
      setProjects(p => [res.project, ...p])
      setShowCreate(false)
      setForm(defaultForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project and all its counters?')) return
    setDeletingId(id)
    try {
      await api.del(`/projects/${id}`)
      setProjects(p => p.filter(pr => pr.id !== id))
    } catch {
      alert('Failed to delete project')
    } finally {
      setDeletingId(null)
    }
  }

  const f = (field: keyof CreateProjectForm) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value })),
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No projects yet</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Start tracking your first knitting or crochet project.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Create a project
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const totalVal = project.counters.reduce((s, c) => s + c.value, 0)
            const totalTarget = project.counters.reduce((s, c) => s + (c.target ?? 0), 0)
            return (
              <div key={project.id} className="card p-5 flex flex-col group hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-semibold text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors line-clamp-2"
                    >
                      {project.name}
                    </Link>
                    <StatusBadge status={project.status} />
                  </div>
                  <button
                    onClick={() => handleDelete(project.id)}
                    disabled={deletingId === project.id}
                    className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                    aria-label="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1">
                  {project.yarnBrand && (
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-60">Yarn:</span>
                      {project.yarnBrand}
                      {project.yarnWeight && ` (${project.yarnWeight})`}
                    </div>
                  )}
                  {project.yarnColor && (
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-60">Color:</span> {project.yarnColor}
                    </div>
                  )}
                  {project.needleSize && (
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-60">Needles:</span> {project.needleSize}
                    </div>
                  )}
                  <div>
                    {project.counters.length} counter{project.counters.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {totalTarget > 0 && (
                  <div className="mb-3">
                    <ProgressBar value={totalVal} target={totalTarget} />
                  </div>
                )}

                <Link
                  to={`/projects/${project.id}`}
                  className="btn-secondary w-full text-xs py-1.5 mt-auto"
                >
                  Open <ChevronRight size={14} />
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(defaultForm); setError('') }} title="New Project" size="lg">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input className="input" placeholder="My cozy sweater" {...f('name')} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Add some notes…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Yarn Brand</label>
              <input className="input" placeholder="Malabrigo" {...f('yarnBrand')} />
            </div>
            <div>
              <label className="label">Yarn Weight</label>
              <select className="input" {...f('yarnWeight')}>
                <option value="">Select weight</option>
                {YARN_WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Yarn Color</label>
              <input className="input" placeholder="Peacock" {...f('yarnColor')} />
            </div>
            <div>
              <label className="label">Needle Size</label>
              <input className="input" placeholder="US 7 / 4.5mm" {...f('needleSize')} />
            </div>
          </div>
          {patterns.length > 0 && (
            <div>
              <label className="label">Attach Pattern</label>
              <select className="input" {...f('patternId')}>
                <option value="">No pattern</option>
                {patterns.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
