import React, { useState, useEffect } from 'react'
import { Plus, Hash } from 'lucide-react'
import CounterWidget from '../components/CounterWidget'

interface LocalCounter {
  id: string
  name: string
  value: number
  target: number | null
}

const STORAGE_KEY = 'sc_quick_counters'

function loadCounters(): LocalCounter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return [{ id: '1', name: 'Row counter', value: 0, target: null }]
}

function saveCounters(counters: LocalCounter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counters))
}

export default function QuickCounters() {
  const [counters, setCounters] = useState<LocalCounter[]>(loadCounters)

  useEffect(() => {
    saveCounters(counters)
  }, [counters])

  function addCounter() {
    const newCounter: LocalCounter = {
      id: Date.now().toString(),
      name: `Counter ${counters.length + 1}`,
      value: 0,
      target: null,
    }
    setCounters(c => [...c, newCounter])
  }

  function updateValue(id: string, value: number) {
    setCounters(c => c.map(x => x.id === id ? { ...x, value } : x))
  }

  function rename(id: string, name: string) {
    setCounters(c => c.map(x => x.id === id ? { ...x, name } : x))
  }

  function setTarget(id: string, target: number | null) {
    setCounters(c => c.map(x => x.id === id ? { ...x, target } : x))
  }

  function deleteCounter(id: string) {
    setCounters(c => c.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Counters</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Saved locally in your browser — no project needed
          </p>
        </div>
        <button className="btn-primary" onClick={addCounter}>
          <Plus size={16} />
          Add counter
        </button>
      </div>

      {counters.length === 0 ? (
        <div className="card p-12 text-center">
          <Hash size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No counters yet</p>
          <button className="btn-primary" onClick={addCounter}>
            <Plus size={16} />
            Add a counter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {counters.map(c => (
            <CounterWidget
              key={c.id}
              id={c.id}
              name={c.name}
              value={c.value}
              target={c.target}
              onUpdate={updateValue}
              onRename={rename}
              onDelete={counters.length > 1 ? deleteCounter : undefined}
              onSetTarget={setTarget}
            />
          ))}
        </div>
      )}

      <div className="card p-4 bg-brand-50 dark:bg-brand-950/30 border-brand-100 dark:border-brand-900/40">
        <p className="text-sm text-brand-700 dark:text-brand-400">
          <strong>Tip:</strong> Quick counters are saved in your browser. For counters that sync across devices and save progress per project, attach them to a{' '}
          <a href="/projects" className="underline font-medium">project</a>.
        </p>
      </div>
    </div>
  )
}
