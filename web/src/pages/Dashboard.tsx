import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, Hash, Plus, ArrowRight, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import type { Project } from '../types'

function QuickCounter() {
  const [count, setCount] = useState(0)
  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Quick Counter
      </h3>
      <div className="flex items-center justify-between gap-4">
        <button
          className="flex-1 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-3xl text-gray-700 dark:text-gray-200 font-light transition-all active:scale-95 flex items-center justify-center"
          onClick={() => setCount(c => Math.max(0, c - 1))}
        >
          −
        </button>
        <span className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums w-24 text-center">
          {count}
        </span>
        <button
          className="flex-1 h-16 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-3xl font-light transition-all active:scale-95 flex items-center justify-center shadow-md shadow-brand-200 dark:shadow-brand-900/40"
          onClick={() => setCount(c => c + 1)}
        >
          +
        </button>
      </div>
      <button
        className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
        onClick={() => setCount(0)}
      >
        Reset
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const api = useApi()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ projects: Project[] }>('/projects')
      .then(d => setProjects(d.projects))
      .catch(console.error)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = projects.filter(p => p.status === 'active')
  const recent = projects.slice(0, 3)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Here's your crafting overview
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
              <FolderOpen size={16} className="text-brand-600 dark:text-brand-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
          </div>
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{active.length}</span>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">projects</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Hash size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
          </div>
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{projects.length}</span>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">projects ever</p>
        </div>
        <div className="card p-5 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
          </div>
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {projects.filter(p => p.status === 'completed').length}
          </span>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">projects</p>
        </div>
      </div>

      {/* Quick counter */}
      <QuickCounter />

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Projects</h2>
          <Link
            to="/projects"
            className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="card p-8 text-center">
            <FolderOpen size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No projects yet</p>
            <Link to="/projects" className="btn-primary text-sm">
              <Plus size={16} />
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map(project => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="card p-4 flex items-center justify-between hover:border-brand-200 dark:hover:border-brand-800 transition-all group"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {project.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {project.counters.length} counter{project.counters.length !== 1 ? 's' : ''}
                    {project.yarnBrand && ` · ${project.yarnBrand}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <StatusBadge status={project.status} />
                  <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-brand-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    frogged: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    hibernating: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  }
  return (
    <span className={`badge ${styles[status] ?? styles.active}`}>
      {status}
    </span>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
