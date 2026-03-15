export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface Counter {
  id: string
  name: string
  value: number
  target: number | null
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  yarnBrand: string | null
  yarnWeight: string | null
  yarnColor: string | null
  needleSize: string | null
  status: 'active' | 'completed' | 'frogged' | 'hibernating'
  notes: string | null
  createdAt: string
  updatedAt: string
  userId: string
  counters: Counter[]
  pattern: Pattern | null
  patternId: string | null
}

export interface Pattern {
  id: string
  name: string
  sourceUrl: string | null
  notes: string | null
  tags: string | null
  imageUrl: string | null
  userId: string
  createdAt: string
}

export interface StashEntry {
  id: string
  brand: string
  name: string
  weight: 'lace' | 'fingering' | 'sport' | 'dk' | 'worsted' | 'aran' | 'bulky' | 'super-bulky'
  color: string | null
  yardage: number | null
  quantity: number
  notes: string | null
  userId: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}
