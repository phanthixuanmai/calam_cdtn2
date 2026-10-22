export type Envelope<T> = {
  success: boolean
  message: string
  data: T
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<Envelope<T>> {
  const headers = new Headers(options.headers)
  const token = localStorage.getItem('fm.customer.token')
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`/api${path}`, { ...options, headers })
  const payload = await response.json() as Envelope<T>
  if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể kết nối máy chủ')
  return payload
}

export type Role = 'STUDENT' | 'EMPLOYER' | 'ADMIN'
export type Profile = {
  id: string
  name: string
  email: string
  username: string
  phone?: string
  role: Role
  bio?: string
  address?: string
  skills?: string
  cvUrl?: string
  companyName?: string
  description?: string
  website?: string
  location?: string
}

export type Job = {
  id: string
  title: string
  description: string
  category?: string
  location?: string
  salaryRange?: string
  status: 'OPEN' | 'FILLED' | 'COMPLETED' | 'CLOSED'
  employer?: { id: string; name: string; employerProfile?: { companyName?: string } }
}

export type Application = {
  id: string
  job: Job
  student: Profile
  cvUrl?: string
  coverLetter: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
}

export type Notification = {
  id: string
  title: string
  content: string
  read: boolean
  createdAt?: string
}