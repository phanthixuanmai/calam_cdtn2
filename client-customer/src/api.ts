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
  availability?: AvailabilitySlot[]
}

export type AvailabilitySlot = {
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  startTime: string
  endTime: string
}

export type WorkStage = 'RECRUITING' | 'HIRED' | 'IN_PROGRESS' | 'COMPLETED'

export type Job = {
  id: string
  title: string
  description: string
  category?: string
  location?: string
  salaryRange?: string
  status: 'OPEN' | 'FILLED' | 'COMPLETED' | 'CLOSED'
  workStage: WorkStage
  workSchedule?: string
  startDate?: string
  endDate?: string
  employer?: { id: string; name: string; employerProfile?: { companyName?: string } }
}

export type Application = {
  id: string
  job: Job
  student: Profile & {
    studentProfile?: Pick<Profile, 'bio' | 'address' | 'skills' | 'cvUrl' | 'availability'>
  }
  cvUrl?: string
  coverLetter: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
}

export type Review = {
  id: string
  applicationId: string
  jobId: string
  reviewerId: string
  reviewer: Profile
  reviewee: Profile
  rating: number
  comment?: string
  targetType: Role
}

export type Notification = {
  id: string
  title: string
  content: string
  read: boolean
  createdAt?: string
}

export type EmployerDashboardStats = {
  totalJobs: number
  openJobs: number
  closedJobs: number
  totalApplications: number
  pendingApplications: number
  acceptedApplications: number
  inProgressJobs: number
  completedJobs: number
}