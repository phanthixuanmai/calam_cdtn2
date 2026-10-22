export type Envelope<T> = { success: boolean; message: string; data: T }

export async function api<T>(path: string, options: RequestInit = {}): Promise<Envelope<T>> {
  const headers = new Headers(options.headers)
  const token = localStorage.getItem('fm.admin.token')
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`/api${path}`, { ...options, headers })
  const payload = await response.json() as Envelope<T>
  if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể kết nối máy chủ')
  return payload
}

export type Role = 'STUDENT' | 'EMPLOYER' | 'ADMIN'
export type User = {
  id: string
  name: string
  email: string
  username: string
  phone?: string
  role: Role
  enabled: boolean
}
export type Job = {
  id: string
  title: string
  category?: string
  location?: string
  status: string
  employer?: { name: string; email?: string }
}
export type Stats = {
  totalStudents: number
  totalEmployers: number
  totalJobs: number
  totalApplications: number
  totalCompletedJobs: number
}