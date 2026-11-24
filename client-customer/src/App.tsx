import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft, ArrowRight, Bell, BriefcaseBusiness, Check, ChevronRight, CircleUserRound,
  ClipboardList, Filter, LogOut, MapPin, Plus, Search, ShieldCheck, Sparkles,
  X,
} from 'lucide-react'
import {
  api, type Application, type AvailabilitySlot, type EmployerDashboardStats, type Job, type Notification,
  type Profile, type Review, type Role, type WorkStage,
} from './api'

type View = 'dashboard' | 'jobs' | 'applications' | 'candidates' | 'notifications' | 'profile'
type ApplicationFilter = 'all' | 'pending' | 'active' | 'completed'
type AuthData = { token: string; role: Role; email: string; name: string }

const weekdays: { value: AvailabilitySlot['day']; label: string }[] = [
  { value: 'MONDAY', label: 'Thứ 2' },
  { value: 'TUESDAY', label: 'Thứ 3' },
  { value: 'WEDNESDAY', label: 'Thứ 4' },
  { value: 'THURSDAY', label: 'Thứ 5' },
  { value: 'FRIDAY', label: 'Thứ 6' },
  { value: 'SATURDAY', label: 'Thứ 7' },
  { value: 'SUNDAY', label: 'Chủ nhật' },
]

const statusLabels: Record<string, string> = {
  OPEN: 'Đang tuyển', FILLED: 'Đã đủ người', COMPLETED: 'Hoàn tất', CLOSED: 'Đã đóng',
  PENDING: 'Đang chờ', ACCEPTED: 'Được nhận', REJECTED: 'Chưa phù hợp', CANCELLED: 'Đã hủy',
}

const workStageLabels: Record<WorkStage, string> = {
  RECRUITING: 'Đang tuyển',
  HIRED: 'Đã nhận người',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
}

function AvailabilityEditor({ value, onChange, legend = 'Thời gian có thể làm việc', hint = 'Chọn ngày và khung giờ bạn có thể nhận việc. Bạn có thể để trống nếu chưa xác định.' }: {
  value: AvailabilitySlot[]
  onChange: (slots: AvailabilitySlot[]) => void
  legend?: string
  hint?: string
}) {
  const selectedDays = weekdays.filter(day => value.some(slot => slot.day === day.value))

  function toggleDay(day: AvailabilitySlot['day']) {
    if (value.some(slot => slot.day === day)) {
      onChange(value.filter(slot => slot.day !== day))
    } else {
      onChange([...value, { day, startTime: '', endTime: '' }])
    }
  }

  function updateSlot(index: number, field: 'startTime' | 'endTime', nextValue: string) {
    onChange(value.map((slot, slotIndex) => slotIndex === index ? { ...slot, [field]: nextValue } : slot))
  }

  return (
    <fieldset className="availability-editor">
      <legend>{legend}</legend>
      <p>{hint}</p>
      <div className="availability-days">
        {weekdays.map(day => {
          const selected = value.some(slot => slot.day === day.value)
          return <button key={day.value} type="button" className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => toggleDay(day.value)}>{day.label}</button>
        })}
      </div>
      {selectedDays.map(day => {
        const daySlots = value.map((slot, index) => ({ slot, index })).filter(item => item.slot.day === day.value)
        return (
          <div className="availability-day" key={day.value}>
            <h4>{day.label}</h4>
            {daySlots.map(({ slot, index }, slotIndex) => (
              <div className="availability-time-row" key={`${day.value}-${slotIndex}`}>
                <label>Giờ bắt đầu<input type="time" value={slot.startTime} onChange={event => updateSlot(index, 'startTime', event.target.value)} /></label>
                <label>Giờ kết thúc<input type="time" value={slot.endTime} onChange={event => updateSlot(index, 'endTime', event.target.value)} /></label>
                {daySlots.length > 1 && <button type="button" className="small-button reject" aria-label={`Xóa khung giờ ${slotIndex + 1} ${day.label}`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><X size={14} /></button>}
              </div>
            ))}
            <button type="button" className="availability-add-slot" onClick={() => onChange([...value, { day: day.value, startTime: '', endTime: '' }])}>+ Thêm khung giờ</button>
          </div>
        )
      })}
    </fieldset>
  )
}

function validateAvailability(slots: AvailabilitySlot[]): string | null {
  const byDay = new Map<string, AvailabilitySlot[]>()
  for (const slot of slots) {
    if (!slot.startTime || !slot.endTime) return 'Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc.'
    if (slot.endTime <= slot.startTime) return 'Giờ kết thúc phải sau giờ bắt đầu.'
    byDay.set(slot.day, [...(byDay.get(slot.day) ?? []), slot])
  }
  for (const daySlots of byDay.values()) {
    const ordered = [...daySlots].sort((a, b) => a.startTime.localeCompare(b.startTime))
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index].startTime < ordered[index - 1].endTime) {
        return 'Các khung giờ trong cùng một ngày không được chồng lấn.'
      }
    }
  }
  return null
}

function formatSchedule(slots: AvailabilitySlot[]): string {
  return weekdays
    .map(day => {
      const times = slots
        .filter(slot => slot.day === day.value && slot.startTime && slot.endTime)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map(slot => `${slot.startTime}-${slot.endTime}`)
      return times.length ? `${day.label}: ${times.join(', ')}` : ''
    })
    .filter(Boolean)
    .join('; ')
}

function parseSchedule(text?: string): AvailabilitySlot[] {
  if (!text) return []
  const slots: AvailabilitySlot[] = []
  for (const part of text.split(';')) {
    const colon = part.indexOf(':')
    if (colon < 0) return []
    const day = weekdays.find(item => item.label === part.slice(0, colon).trim())
    if (!day) return []
    for (const range of part.slice(colon + 1).split(',')) {
      const match = range.trim().match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/)
      if (!match) return []
      slots.push({ day: day.value, startTime: match[1], endTime: match[2] })
    }
  }
  return slots
}

function JobScheduleField({ initial }: { initial?: string }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(() => parseSchedule(initial))
  const legacyText = initial && slots.length === 0 ? initial : ''
  return (
    <>
      <AvailabilityEditor
        value={slots}
        onChange={setSlots}
        legend="Ngày và giờ làm việc"
        hint="Chọn các ngày làm việc trong tuần (Thứ 2 đến Chủ nhật), sau đó chọn giờ bắt đầu và kết thúc cho từng ngày."
      />
      {legacyText && <p className="field-hint">Lịch cũ: {legacyText}. Chọn ngày ở trên để thay thế.</p>}
      <input type="hidden" name="workSchedule" value={slots.length ? formatSchedule(slots) : legacyText} />
      <input type="hidden" name="scheduleSlots" value={JSON.stringify(slots)} />
    </>
  )
}

function toMinutes(value: string, fallback: number) {
  const match = value.match(/^(\d{2}):(\d{2})$/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : fallback
}

function jobMatchesSchedule(job: Job, filter: AvailabilitySlot[]) {
  if (filter.length === 0) return true
  const jobSlots = parseSchedule(job.workSchedule)
  return jobSlots.some(jobSlot => filter.some(wanted => {
    if (wanted.day !== jobSlot.day) return false
    const from = toMinutes(wanted.startTime, 0)
    const to = toMinutes(wanted.endTime, 24 * 60)
    return toMinutes(jobSlot.startTime, 0) < to && toMinutes(jobSlot.endTime, 24 * 60) > from
  }))
}

function JobScheduleFilter({ value, onChange }: { value: AvailabilitySlot[]; onChange: (slots: AvailabilitySlot[]) => void }) {
  const invalid = value.some(slot => slot.startTime && slot.endTime && slot.endTime <= slot.startTime)
  return (
    <div className="schedule-filter">
      <AvailabilityEditor
        value={value}
        onChange={onChange}
        legend="Lọc theo ngày và giờ làm việc"
        hint="Chọn các ngày bạn muốn đi làm (Thứ 2 đến Chủ nhật), sau đó chọn khoảng giờ. Danh sách chỉ hiện các công việc có ca làm trùng với lựa chọn của bạn."
      />
      {invalid && <p className="field-hint" role="alert">Giờ kết thúc phải sau giờ bắt đầu.</p>}
      {value.length > 0 && <button type="button" className="availability-add-slot" onClick={() => onChange([])}>Xóa bộ lọc ngày giờ</button>}
    </div>
  )
}

function buildAcceptedEmail(application: Application, employer: Profile) {
  const job = application.job
  const company = employer.companyName || employer.name
  const lines = [
    `Xin chào ${application.student?.name ?? ''},`,
    '',
    `${company} đã chấp nhận đơn ứng tuyển của bạn cho công việc "${job?.title ?? ''}".`,
    '',
    'Thông tin công việc:',
    job?.location ? `- Địa điểm: ${job.location}` : '',
    job?.salaryRange ? `- Mức lương: ${job.salaryRange}` : '',
    job?.workSchedule ? `- Lịch làm việc: ${job.workSchedule}` : '',
    '',
    'Vui lòng phản hồi mail này để xác nhận và thống nhất các bước tiếp theo.',
    '',
    'Trân trọng,',
    employer.name,
    employer.phone ? `Điện thoại: ${employer.phone}` : '',
  ].filter((line, index, all) => line !== '' || all[index - 1] !== '')
  return {
    to: application.student?.email ?? '',
    subject: `Bạn đã được nhận vào công việc: ${job?.title ?? ''}`,
    body: lines.join('\n'),
  }
}

function ContactApplicant({ application, employer }: { application: Application; employer: Profile }) {
  const mail = buildAcceptedEmail(application, employer)
  if (!mail.to) return null
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(mail.to)}&su=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`
  const mailtoUrl = `mailto:${mail.to}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`
  return (
    <div className="row-actions contact-applicant">
      <a className="small-button accept" href={gmailUrl} target="_blank" rel="noreferrer">Gửi mail cho ứng viên (Gmail)</a>
      <a className="small-button" href={mailtoUrl}>Mở ứng dụng mail khác</a>
    </div>
  )
}

function getPublicJobIdFromHash() {
  const match = window.location.hash.match(/^#\/jobs\/(.+)$/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

function getJobSummary(description: string) {
  const summary = description.trim().replace(/\s+/g, ' ')
  if (summary.length <= 160) return summary
  const excerpt = summary.slice(0, 157)
  const lastWordBoundary = excerpt.lastIndexOf(' ')
  return `${excerpt.slice(0, lastWordBoundary > 120 ? lastWordBoundary : excerpt.length).trimEnd()}...`
}

function formatJobDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN')
}

function getSafeExternalUrl(value?: string) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('fm.customer.token'))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [scheduleFilter, setScheduleFilter] = useState<AvailabilitySlot[]>([])
  const displayJobs = jobs.filter(job => jobMatchesSchedule(job, scheduleFilter))
  const [applications, setApplications] = useState<Application[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [view, setView] = useState<View>('jobs')
  const [employerStats, setEmployerStats] = useState<EmployerDashboardStats | null>(null)
  const [employerApplications, setEmployerApplications] = useState<Application[]>([])
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [guestAuthOpen, setGuestAuthOpen] = useState(false)
  const [authRole, setAuthRole] = useState<'STUDENT' | 'EMPLOYER'>('STUDENT')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [jobStatusFilter, setJobStatusFilter] = useState('')
  const [jobFormOpen, setJobFormOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const jobSubmitInFlight = useRef(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [applicationFilter, setApplicationFilter] = useState<ApplicationFilter>('all')
  const [applyingTo, setApplyingTo] = useState<Job | null>(null)
  const [applicantsFor, setApplicantsFor] = useState<Job | null>(null)
  useEffect(() => {
    const id = applicantsFor?.id ?? selectedJob?.id
    if (!id) return
    const timer = window.setTimeout(() => {
      const panel = document.getElementById(`job-applicants-${id}`) ?? document.getElementById(`job-panel-${id}`)
      panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [applicantsFor?.id, selectedJob?.id])
  const [applicants, setApplicants] = useState<Application[]>([])
  const [candidateJobFilter, setCandidateJobFilter] = useState('')
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('')
  const [candidateKeyword, setCandidateKeyword] = useState('')
  const [workReviews, setWorkReviews] = useState<Record<string, Review[]>>({})
  const [registrationAvailability, setRegistrationAvailability] = useState<AvailabilitySlot[]>([])
  const [profileAvailability, setProfileAvailability] = useState<AvailabilitySlot[]>([])
  const [publicJobId, setPublicJobId] = useState<string | null>(() => getPublicJobIdFromHash())
  const [publicJob, setPublicJob] = useState<Job | null>(null)
  const [publicJobLoading, setPublicJobLoading] = useState(false)
  const [publicJobError, setPublicJobError] = useState('')

  async function loadJobs(filters = '', owned = false) {
    const result = await api<Job[]>(owned ? `/jobs/my${filters}` : `/jobs${filters}`)
    setJobs(result.data)
  }

  async function loadReviewsForApplications(items: Application[]) {
    const accepted = items.filter(item => item.status === 'ACCEPTED')
    const entries = await Promise.all(accepted.map(async item => {
      const result = await api<Review[]>(`/reviews/work/${item.id}`)
      return [item.id, result.data] as const
    }))
    return Object.fromEntries(entries)
  }

  async function loadWorkspace(currentProfile: Profile) {
    const tasks: Promise<unknown>[] = []
    if (currentProfile.role === 'EMPLOYER') {
      tasks.push(api<Job[]>('/jobs/my').then(async result => {
        setJobs(result.data)
        const grouped = await Promise.all(result.data.map(job =>
          api<Application[]>(`/jobs/${encodeURIComponent(job.id)}/applications`).then(response => response.data)
        ))
        const allApplications = grouped.flat()
        setEmployerApplications(allApplications)
        setWorkReviews(await loadReviewsForApplications(allApplications))
      }))
      tasks.push(api<EmployerDashboardStats>('/employer/dashboard').then(result => setEmployerStats(result.data)))
    } else {
      tasks.push(loadJobs())
    }
    if (currentProfile.role === 'STUDENT') {
      tasks.push(api<Application[]>('/applications/my').then(async result => {
        setApplications(result.data)
        setWorkReviews(await loadReviewsForApplications(result.data))
      }))
    }
    tasks.push(api<Notification[]>('/notifications').then(result => setNotifications(result.data)))
    await Promise.all(tasks)
  }

  useEffect(() => {
    if (!token) {
      setProfile(null)
      setWorkspaceLoading(false)
      setEmployerStats(null)
      setEmployerApplications([])
      loadJobs().catch(caught => {
        setError(caught instanceof Error ? caught.message : 'Không thể tải danh sách việc làm')
      })
      return
    }

    setWorkspaceLoading(true)
    setEmployerStats(null)
    setEmployerApplications([])
    api<Profile>('/users/me')
      .then(result => {
        setProfile(result.data)
        setProfileAvailability(result.data.availability ?? [])
        if (result.data.role === 'EMPLOYER') setView('dashboard')
        return loadWorkspace(result.data).catch(caught => {
          setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu tài khoản')
        })
      })
      .catch(() => {
        localStorage.removeItem('fm.customer.token')
        setToken(null)
        setProfile(null)
      })
      .finally(() => setWorkspaceLoading(false))
  }, [token])

  useEffect(() => {
    const syncPublicRoute = () => {
      setPublicJobId(getPublicJobIdFromHash())
      if (window.location.hash === '#public-jobs') {
        window.requestAnimationFrame(() => {
          document.getElementById('public-jobs')?.scrollIntoView({ behavior: 'smooth' })
        })
      }
    }
    window.addEventListener('popstate', syncPublicRoute)
    window.addEventListener('hashchange', syncPublicRoute)
    return () => {
      window.removeEventListener('popstate', syncPublicRoute)
      window.removeEventListener('hashchange', syncPublicRoute)
    }
  }, [])

  useEffect(() => {
    if (!publicJobId) {
      setPublicJob(null)
      setPublicJobError('')
      setPublicJobLoading(false)
      return
    }

    let active = true
    setPublicJob(null)
    setPublicJobError('')
    setPublicJobLoading(true)
    api<Job>(`/jobs/${encodeURIComponent(publicJobId)}`)
      .then(result => {
        if (active) setPublicJob(result.data)
      })
      .catch(caught => {
        if (active) setPublicJobError(caught instanceof Error ? caught.message : 'Không thể tải chi tiết công việc')
      })
      .finally(() => {
        if (active) setPublicJobLoading(false)
      })

    return () => {
      active = false
    }
  }, [publicJobId])

  function openPublicJob(job: Job) {
    window.history.pushState(null, '', `#/jobs/${encodeURIComponent(job.id)}`)
    setPublicJobId(job.id)
    setPublicJobError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function backToPublicJobs() {
    window.history.pushState(null, '', '#public-jobs')
    setPublicJobId(null)
    window.requestAnimationFrame(() => {
      document.getElementById('public-jobs')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (authMode === 'register' && authRole === 'STUDENT') {
      const availabilityError = validateAvailability(registrationAvailability)
      if (availabilityError) {
        setError(availabilityError)
        return
      }
    }
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const payload = authMode === 'login'
      ? { emailOrUsername: String(form.get('identity')), password: String(form.get('password')) }
      : {
          name: String(form.get('name')),
          email: String(form.get('email')),
          username: String(form.get('username')),
          phone: String(form.get('phone')),
          password: String(form.get('password')),
          role: authRole,
          availability: authRole === 'STUDENT' ? registrationAvailability : undefined,
        }

    try {
      const result = await api<AuthData>(`/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      localStorage.setItem('fm.customer.token', result.data.token)
      setToken(result.data.token)
      setNotice(`Xin chào ${result.data.name}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Đăng nhập không thành công')
    } finally {
      setBusy(false)
    }
  }

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (keyword.trim()) params.set('keyword', keyword.trim())
    if (category.trim()) params.set('category', category.trim())
    if (location.trim()) params.set('location', location.trim())
    if (profile?.role === 'EMPLOYER' && jobStatusFilter) params.set('status', jobStatusFilter)
    setSearching(true)
    try {
      await loadJobs(params.size ? `?${params.toString()}` : '', profile?.role === 'EMPLOYER')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tìm việc')
    } finally {
      setSearching(false)
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!applyingTo) return
    const form = new FormData(event.currentTarget)
    setBusyAction('application-form')
    try {
      await api<Application>('/applications', {
        method: 'POST',
        body: JSON.stringify({
          jobId: applyingTo.id,
          cvUrl: String(form.get('cvUrl')),
          coverLetter: String(form.get('coverLetter')),
        }),
      })
      setApplyingTo(null)
      setNotice('Đơn ứng tuyển đã được gửi')
      if (profile) await loadWorkspace(profile)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể gửi đơn')
    } finally {
      setBusyAction(null)
    }
  }

  async function submitJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (jobSubmitInFlight.current) return
    jobSubmitInFlight.current = true
    setBusyAction('job-form')
    const form = new FormData(event.currentTarget)
    const payload: Record<string, string | null> = {}
    form.forEach((value, key) => {
      payload[key] = String(value)
    })
    payload.startDate = payload.startDate || null
    payload.endDate = payload.endDate || null
    let scheduleSlots: AvailabilitySlot[] = []
    try {
      scheduleSlots = JSON.parse(String(payload.scheduleSlots || '[]'))
    } catch {
      scheduleSlots = []
    }
    delete payload.scheduleSlots
    const scheduleError = validateAvailability(scheduleSlots)
    if (scheduleError) {
      setError(scheduleError)
      jobSubmitInFlight.current = false
      setBusyAction(null)
      return
    }
    try {
      const saved = await api<Job>(editingJob ? `/jobs/${encodeURIComponent(editingJob.id)}` : '/jobs', {
        method: editingJob ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      if (editingJob && selectedJob?.id === saved.data.id) setSelectedJob(saved.data)
      setJobFormOpen(false)
      setEditingJob(null)
      setNotice(editingJob ? 'Tin tuyển dụng đã được cập nhật' : 'Tin tuyển dụng đã được đăng')
      if (profile) await loadWorkspace(profile)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu tin tuyển dụng')
    } finally {
      jobSubmitInFlight.current = false
      setBusyAction(null)
    }
  }

  function editJob(job: Job) {
    setEditingJob(job)
    setJobFormOpen(true)
  }

  async function closeJob(job: Job) {
    if (!window.confirm(`Đóng tin tuyển dụng “${job.title}”? Sinh viên sẽ không thể gửi đơn mới.`)) return
    setError('')
    setNotice('')
    setBusyAction(`close:${job.id}`)
    try {
      const result = await api<Job>(`/jobs/${encodeURIComponent(job.id)}/close`, { method: 'PUT' })
      if (result.data.status !== 'CLOSED') {
        throw new Error('Máy chủ chưa xác nhận tin tuyển dụng đã đóng')
      }
      setJobs(current => current.map(item => item.id === result.data.id ? result.data : item))
      if (selectedJob?.id === result.data.id) setSelectedJob(result.data)
      setNotice('Tin tuyển dụng đã được đóng')
      if (profile) await loadWorkspace(profile)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đóng tin tuyển dụng')
    } finally {
      setBusyAction(null)
    }
  }

  async function advanceJob(job: Job) {
    const nextStage: WorkStage | null = job.workStage === 'HIRED'
      ? 'IN_PROGRESS'
      : job.workStage === 'IN_PROGRESS'
        ? 'COMPLETED'
        : null
    if (!nextStage) return
    if (!window.confirm(`Chuyển công việc sang giai đoạn “${workStageLabels[nextStage]}”?`)) return
    setBusyAction(`progress:${job.id}`)
    try {
      const result = await api<Job>(`/jobs/${job.id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ stage: nextStage }),
      })
      if (selectedJob?.id === result.data.id) setSelectedJob(result.data)
      setNotice('Tiến độ công việc đã được cập nhật')
      if (profile) await loadWorkspace(profile)
      if (applicantsFor?.id === job.id) {
        setApplicantsFor(result.data)
        await openApplicants(result.data)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật tiến độ')
    } finally {
      setBusyAction(null)
    }
  }

  async function openApplicants(job: Job) {
    setApplicantsFor(job)
    setApplicants([])
    setError('')
    setBusyAction(`applicants:${job.id}`)
    try {
      const result = await api<Application[]>(`/jobs/${job.id}/applications`)
      setApplicants(result.data)
      const reviews = await loadReviewsForApplications(result.data)
      setWorkReviews(previous => ({ ...previous, ...reviews }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải hồ sơ ứng tuyển')
    } finally {
      setBusyAction(null)
    }
  }

  async function deleteJob(job: Job) {
    if (!window.confirm(`Xóa tin “${job.title}”? Chỉ tin không có hồ sơ ứng tuyển mới được xóa.`)) return
    setBusyAction(`delete:${job.id}`)
    try {
      await api<void>(`/jobs/${encodeURIComponent(job.id)}`, { method: 'DELETE' })
      if (selectedJob?.id === job.id) setSelectedJob(null)
      setNotice('Tin tuyển dụng đã được xóa')
      if (profile) await loadWorkspace(profile)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể xóa tin tuyển dụng')
    } finally {
      setBusyAction(null)
    }
  }

  async function cancelApplication(application: Application) {
    if (!window.confirm(`Hủy đơn ứng tuyển cho “${application.job.title}”?`)) return
    setBusyAction(`cancel:${application.id}`)
    try {
      const result = await api<Application>(`/applications/${application.id}/cancel`, { method: 'PUT' })
      setApplications(items => items.map(item => item.id === application.id ? result.data : item))
      setNotice('Đơn ứng tuyển đã được hủy')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể hủy đơn ứng tuyển')
    } finally {
      setBusyAction(null)
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>, application: Application) {
    event.preventDefault()
    if (!profile) return
    const revieweeId = profile.role === 'STUDENT' ? application.job.employer?.id : application.student.id
    const targetType = profile.role === 'STUDENT' ? 'EMPLOYER' : 'STUDENT'
    if (!revieweeId) {
      setError('Không tìm thấy người cần đánh giá')
      return
    }
    const form = new FormData(event.currentTarget)
    setBusyAction(`review:${application.id}`)
    try {
      await api<Review>('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: application.id,
          revieweeId,
          targetType,
          rating: Number(form.get('rating')),
          comment: String(form.get('comment') ?? ''),
        }),
      })
      const result = await api<Review[]>(`/reviews/work/${application.id}`)
      setWorkReviews(previous => ({ ...previous, [application.id]: result.data }))
      setNotice('Đánh giá của bạn đã được gửi')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể gửi đánh giá')
    } finally {
      setBusyAction(null)
    }
  }

  async function changeApplicationStatus(application: Application, status: 'ACCEPTED' | 'REJECTED') {
    setBusyAction(`status:${application.id}`)
    try {
      const result = await api<Application>(`/applications/${encodeURIComponent(application.id)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      if (profile) await loadWorkspace(profile)
      if (applicantsFor) await openApplicants(result.data.job)
      setNotice(status === 'ACCEPTED' ? 'Đã chấp nhận ứng viên' : 'Đã cập nhật hồ sơ ứng viên')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật hồ sơ')
    } finally {
      setBusyAction(null)
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    if (profile.role === 'STUDENT') {
      const availabilityError = validateAvailability(profileAvailability)
      if (availabilityError) {
        setError(availabilityError)
        return
      }
    }
    const form = new FormData(event.currentTarget)
    const payload = {
      ...Object.fromEntries(form.entries()),
      ...(profile.role === 'STUDENT' ? { availability: profileAvailability } : {}),
    }
    setBusyAction('profile-form')
    try {
      await api('/users/me', { method: 'PUT', body: JSON.stringify(payload) })
      const result = await api<Profile>('/users/me')
      setProfile(result.data)
      setProfileAvailability(result.data.availability ?? [])
      setNotice('Hồ sơ đã được cập nhật')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu hồ sơ')
    } finally {
      setBusyAction(null)
    }
  }

  async function markRead(item: Notification) {
    try {
      await api(`/notifications/${item.id}/read`, { method: 'PUT' })
      setNotifications(items => items.map(value => value.id === item.id ? { ...value, read: true } : value))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật thông báo')
    }
  }

  function signOut() {
    localStorage.removeItem('fm.customer.token')
    setToken(null)
    setProfile(null)
    setJobs([])
    setApplications([])
    setNotifications([])
    setWorkReviews({})
    setProfileAvailability([])
    setView('jobs')
    setSelectedJob(null)
    setGuestAuthOpen(false)
    setApplyingTo(null)
  }

  // Chưa đăng nhập: trang công khai hoặc màn hình đăng nhập/đăng ký
  if (!profile) {
    if (guestAuthOpen) {
      return (
        <main className="auth-layout">
          <section className="auth-story">
            <a className="wordmark" href="#top" onClick={event => {
              event.preventDefault()
              setGuestAuthOpen(false)
              setError('')
            }}>
              <span className="brand-mark">c</span> ca làm
            </a>
            <div className="story-copy">
              <span className="eyebrow"><Sparkles size={14} /> CÔNG VIỆC LINH HOẠT</span>
              <h1>Đi làm thêm.<br /><em>Đi xa hơn.</em></h1>
              <p>Kết nối sinh viên với những công việc part-time phù hợp lịch học và năng lực.</p>
            </div>
            <div className="story-footer"><span>01 / 03</span><span>Hồ sơ · Cơ hội · Kinh nghiệm</span></div>
          </section>

          <section className="auth-panel">
            <div className="auth-topline"><span>CA LÀM / NỀN TẢNG VIỆC LÀM</span><span>TP. HỒ CHÍ MINH</span></div>
            <div className="auth-form-wrap">
              <button className="text-action" type="button" onClick={() => {
                setGuestAuthOpen(false)
                setError('')
              }}>
                <ArrowRight size={16} /> Quay lại trang chủ
              </button>
              <div className="auth-heading">
                <span className="eyebrow">{authMode === 'login' ? 'CHÀO MỪNG QUAY LẠI' : 'BẮT ĐẦU HÀNH TRÌNH'}</span>
                <h2>{authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
                <p>{authMode === 'login' ? 'Tiếp tục khám phá cơ hội phù hợp với bạn.' : 'Một hồ sơ tốt mở ra những cơ hội tốt.'}</p>
              </div>

              <div className="auth-tabs" role="tablist">
                <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => {
                  setAuthMode('login')
                  setError('')
                }}>Đăng nhập</button>
                <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => {
                  setAuthMode('register')
                  setError('')
                }}>Đăng ký</button>
              </div>

              <form className="stack-form" onSubmit={handleAuth}>
                {authMode === 'register' ? <>
                  <div className="role-switch" aria-label="Loại tài khoản">
                    <button type="button" className={authRole === 'STUDENT' ? 'selected' : ''} onClick={() => setAuthRole('STUDENT')}>Sinh viên</button>
                    <button type="button" className={authRole === 'EMPLOYER' ? 'selected' : ''} onClick={() => setAuthRole('EMPLOYER')}>Nhà tuyển dụng</button>
                  </div>
                  <label>Họ và tên<input name="name" required placeholder="Nguyễn Minh Anh" /></label>
                  <label>Email<input name="email" type="email" required placeholder="ban@email.com" /></label>
                  <div className="form-row">
                    <label>Tên người dùng<input name="username" placeholder="minhanh" /></label>
                    <label>Số điện thoại<input name="phone" placeholder="09xx xxx xxx" /></label>
                  </div>
                </> : <label>Email hoặc tên người dùng<input name="identity" required autoComplete="username" placeholder="ban@email.com" /></label>}
                <label>Mật khẩu<input name="password" type="password" required minLength={6} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder="Ít nhất 6 ký tự" /></label>
                {authMode === 'register' && authRole === 'STUDENT' && (
                  <AvailabilityEditor value={registrationAvailability} onChange={setRegistrationAvailability} />
                )}
                {error && <div className="inline-error" role="alert">{error}</div>}
                <button className="button button-dark button-wide" disabled={busy} type="submit">
                  {busy ? 'Đang xử lý...' : authMode === 'login' ? 'Vào Ca Làm' : 'Tạo tài khoản'}
                  <ArrowRight size={17} />
                </button>
              </form>
              <p className="auth-note"><ShieldCheck size={15} /> Tài khoản được bảo vệ bằng xác thực JWT.</p>
            </div>
            <div className="auth-bottom"><span>© 2026 CA LÀM</span><span>HỖ TRỢ / ĐIỀU KHOẢN</span></div>
          </section>
        </main>
      )
    }

    // Trang chủ khách truy cập
    return (
      <main className="public-home">
        <header className="public-header">
          <a className="wordmark" href="#top"><span className="brand-mark">c</span> ca làm</a>
          <div className="public-header-actions">
            <button className="button button-outline" onClick={() => {
              setAuthMode('login')
              setGuestAuthOpen(true)
            }}>Đăng nhập</button>
            <button className="button button-dark" onClick={() => {
              setAuthMode('register')
              setGuestAuthOpen(true)
            }}>Đăng ký <ArrowRight size={16} /></button>
          </div>
        </header>

        {publicJobId ? (
          <section className="public-job-detail">
            <div className="content-wrap">
              <button className="public-back-link" type="button" onClick={backToPublicJobs}>
                <ArrowLeft size={16} /> Quay lại danh sách việc làm
              </button>
              {publicJobLoading && <div className="public-detail-state" role="status">Đang tải chi tiết công việc...</div>}
              {!publicJobLoading && publicJobError && <div className="public-detail-state error" role="alert">{publicJobError}</div>}
              {!publicJobLoading && !publicJobError && !publicJob && <div className="public-detail-state" role="status">Không tìm thấy công việc này hoặc tin tuyển dụng không còn khả dụng.</div>}
              {!publicJobLoading && !publicJobError && publicJob && <div className="public-job-detail-layout">
                <article className="public-job-detail-card">
                  <div className="public-detail-kicker">
                    <span className="eyebrow">CHI TIẾT CÔNG VIỆC</span>
                    <span className={`status-tag ${publicJob.status.toLowerCase()}`}>{statusLabels[publicJob.status]}</span>
                  </div>
                  <h1>{publicJob.title}</h1>
                  <p className="public-detail-company">{publicJob.employer?.employerProfile?.companyName || publicJob.employer?.name || 'Nhà tuyển dụng'}</p>
                  <div className="job-meta public-detail-meta">
                    <span><MapPin size={14} />{publicJob.location || 'Linh hoạt'}</span>
                    {publicJob.category && <span>{publicJob.category}</span>}
                    {publicJob.salaryRange && <span>{publicJob.salaryRange}</span>}
                    {publicJob.workSchedule && <span>{publicJob.workSchedule}</span>}
                    {(publicJob.startDate || publicJob.endDate) && <span>{formatJobDate(publicJob.startDate)}{publicJob.startDate && publicJob.endDate ? ' – ' : ''}{formatJobDate(publicJob.endDate)}</span>}
                  </div>
                  <section className="public-detail-description">
                    <h2>Mô tả công việc</h2>
                    <p>{publicJob.description}</p>
                  </section>
                </article>
                <aside className="public-job-apply-card">
                  <span className="eyebrow">CƠ HỘI DÀNH CHO BẠN</span>
                  <h2>{publicJob.salaryRange || 'Mức lương trao đổi'}</h2>
                  <p>{publicJob.workSchedule || 'Lịch làm việc linh hoạt'}</p>
                  {publicJob.status === 'OPEN'
                    ? <button className="button button-green button-wide" onClick={() => {
                        setApplyingTo(publicJob)
                        setAuthMode('login')
                        setGuestAuthOpen(true)
                        setError('')
                      }}>Ứng tuyển công việc <ArrowRight size={16} /></button>
                    : <p className="public-detail-closed">Tin tuyển dụng này hiện không nhận hồ sơ mới.</p>}
                </aside>
              </div>}
            </div>
          </section>
        ) : <>
        <section className="public-hero">
          <div className="public-hero-copy">
            <span className="eyebrow"><Sparkles size={14} /> CƠ HỘI MỚI MỖI NGÀY</span>
            <h1>Việc tốt,<br /><em>đúng nhịp.</em></h1>
            <p>Khám phá công việc part-time linh hoạt dành cho sinh viên. Tìm cơ hội phù hợp với lịch học, kỹ năng và mục tiêu của bạn.</p>
            <button className="button button-green" onClick={() => document.getElementById('public-jobs')?.scrollIntoView({ behavior: 'smooth' })}>
              Khám phá việc làm <ArrowRight size={17} />
            </button>
          </div>

          {/* Hình minh họa thay thế khung 01 */}
          <div className="public-hero-aside public-hero-illustration" role="img" aria-label="Minh họa sinh viên đang tìm kiếm công việc trên Ca Làm">
            <svg
              viewBox="0 0 520 440"
              xmlns="http://www.w3.org/2000/svg"
              className="hero-illustration-svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#edf4eb" />
                  <stop offset="100%" stopColor="#dcebe1" />
                </linearGradient>
                <linearGradient id="heroLaptop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#456c59" />
                  <stop offset="100%" stopColor="#244b39" />
                </linearGradient>
              </defs>

              {/* Nền */}
              <rect x="15" y="12" width="490" height="416" rx="34" fill="url(#heroBg)" />
              <circle cx="415" cy="94" r="57" fill="#c6ddce" opacity=".75" />
              <circle cx="89" cy="345" r="52" fill="#d5e5d6" />
              <path d="M42 362 Q130 310 194 364 T360 355 T482 367" fill="none" stroke="#bfd7c7" strokeWidth="2" />

              {/* Sao trang trí */}
              <path d="M113 82 L122 104 L144 113 L122 122 L113 144 L104 122 L82 113 L104 104 Z" fill="#e0b76f" />
              <path d="M396 173 L402 187 L416 193 L402 199 L396 213 L390 199 L376 193 L390 187 Z" fill="#e0b76f" />
              <circle cx="365" cy="68" r="5" fill="#e0b76f" />
              <circle cx="151" cy="211" r="5" fill="#8eb59d" />
              <circle cx="445" cy="287" r="5" fill="#8eb59d" />

              {/* Cây bên trái */}
              <path d="M70 298 Q80 264 75 224" fill="none" stroke="#54765e" strokeWidth="8" strokeLinecap="round" />
              <ellipse cx="57" cy="240" rx="24" ry="35" transform="rotate(-30 57 240)" fill="#92b69a" />
              <ellipse cx="91" cy="218" rx="25" ry="36" transform="rotate(30 91 218)" fill="#779f83" />
              <ellipse cx="70" cy="199" rx="23" ry="31" fill="#a9c6ae" />
              <ellipse cx="50" cy="279" rx="19" ry="27" transform="rotate(-25 50 279)" fill="#b2cdb7" />

              {/* Chồng sách bên phải */}
              <rect x="380" y="316" width="86" height="19" rx="5" fill="#e2b56f" transform="rotate(-7 380 316)" />
              <rect x="390" y="295" width="79" height="21" rx="5" fill="#f4eee0" transform="rotate(5 390 295)" />
              <rect x="376" y="274" width="93" height="20" rx="5" fill="#9dbda6" transform="rotate(-4 376 274)" />
              <path d="M395 281 L452 277" stroke="#54765e" strokeWidth="2" />
              <path d="M400 305 L455 310" stroke="#d5c5a6" strokeWidth="2" />

              {/* Người - tóc */}
              <path d="M195 144 C192 96 232 75 272 92 C309 107 307 150 291 179 L215 187 Z" fill="#35473d" />
              <ellipse cx="247" cy="148" rx="48" ry="53" fill="#e8b991" />
              <path d="M199 137 C205 98 244 82 276 101 C292 110 299 128 295 143 C276 135 263 122 252 110 C242 132 224 140 199 137 Z" fill="#35473d" />
              <path d="M198 145 C191 174 205 191 219 198 L213 163 Z" fill="#35473d" />
              <path d="M279 144 Q302 154 290 171" fill="none" stroke="#35473d" strokeWidth="10" strokeLinecap="round" />

              {/* Khuôn mặt */}
              <ellipse cx="231" cy="149" rx="4" ry="5" fill="#554336" />
              <ellipse cx="263" cy="149" rx="4" ry="5" fill="#554336" />
              <path d="M239 168 Q248 175 257 168" fill="none" stroke="#b36e58" strokeWidth="3" strokeLinecap="round" />
              <path d="M220 137 Q229 132 237 137" fill="none" stroke="#594536" strokeWidth="3" strokeLinecap="round" />
              <path d="M257 137 Q266 132 274 137" fill="none" stroke="#594536" strokeWidth="3" strokeLinecap="round" />

              {/* Cổ và áo */}
              <rect x="233" y="188" width="30" height="31" rx="10" fill="#e1ad83" />
              <path d="M182 232 Q192 201 228 204 L257 204 Q293 203 308 233 L323 300 L174 300 Z" fill="#6f9c7c" />
              <path d="M226 206 L247 230 L266 206" fill="#f4eee0" />
              <path d="M247 230 L260 246 L252 270 L239 270 L231 246 Z" fill="#e0b56f" />
              <path d="M185 233 Q164 250 167 280 L187 303 L205 283 L200 257 Z" fill="#6f9c7c" />
              <path d="M303 232 Q327 246 331 273 L316 300 L296 282 L296 257 Z" fill="#6f9c7c" />

              {/* Tay */}
              <path d="M188 280 Q198 296 223 301" fill="none" stroke="#e8b991" strokeWidth="17" strokeLinecap="round" />
              <path d="M310 279 Q294 292 281 300" fill="none" stroke="#e8b991" strokeWidth="17" strokeLinecap="round" />

              {/* Laptop */}
              <rect x="176" y="269" width="147" height="91" rx="11" fill="url(#heroLaptop)" />
              <rect x="186" y="279" width="127" height="71" rx="6" fill="#f6f5ed" />
              <rect x="196" y="290" width="46" height="7" rx="3.5" fill="#b6cfbb" />
              <rect x="196" y="303" width="91" height="5" rx="2.5" fill="#dce5dc" />
              <rect x="196" y="313" width="76" height="5" rx="2.5" fill="#dce5dc" />
              <rect x="196" y="323" width="57" height="5" rx="2.5" fill="#dce5dc" />
              <rect x="196" y="333" width="88" height="5" rx="2.5" fill="#dce5dc" />
              <path d="M160 360 L338 360 L326 371 Q323 375 316 375 L183 375 Q175 375 172 371 Z" fill="#78927e" />

              {/* Cánh tay đặt trên laptop */}
              <path d="M216 225 Q209 245 216 264 L236 279" fill="none" stroke="#e8b991" strokeWidth="17" strokeLinecap="round" />
              <path d="M282 226 Q292 245 286 262 L270 278" fill="none" stroke="#e8b991" strokeWidth="17" strokeLinecap="round" />

              {/* Thẻ công việc nổi */}
              <rect x="342" y="126" width="117" height="77" rx="13" fill="#fffefa" stroke="#d7e2d7" strokeWidth="1.5" />
              <rect x="356" y="141" width="29" height="29" rx="8" fill="#e4eee8" />
              <path d="M365 149 H376 V160 H365 Z" fill="#4e8063" />
              <rect x="394" y="145" width="49" height="6" rx="3" fill="#3f5f4b" />
              <rect x="394" y="157" width="39" height="5" rx="2.5" fill="#cbd9ce" />
              <rect x="356" y="181" width="87" height="7" rx="3.5" fill="#e5eee6" />

              {/* Thẻ check */}
              <circle cx="150" cy="166" r="25" fill="#fffefa" />
              <circle cx="150" cy="166" r="17" fill="#4e8063" />
              <path d="M142 166 L148 172 L159 159" fill="none" stroke="#fffefa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

              {/* Thẻ CV */}
              <rect x="93" y="319" width="65" height="82" rx="8" fill="#fffefa" transform="rotate(-9 93 319)" />
              <rect x="107" y="335" width="29" height="5" rx="2.5" fill="#759b7d" transform="rotate(-9 107 335)" />
              <rect x="105" y="346" width="38" height="4" rx="2" fill="#d8e2d9" transform="rotate(-9 105 346)" />
              <rect x="103" y="356" width="34" height="4" rx="2" fill="#d8e2d9" transform="rotate(-9 103 356)" />
              <rect x="101" y="366" width="26" height="4" rx="2" fill="#d8e2d9" transform="rotate(-9 101 366)" />
            </svg>
          </div>
        </section>

        <section className="public-jobs-section" id="public-jobs">
          <div className="content-wrap">
            {(notice || error) && <div className={error ? 'toast toast-error' : 'toast'} role="status">{error || notice}<button onClick={() => {
              setError('')
              setNotice('')
            }} aria-label="Đóng"><X size={15} /></button></div>}

            <section className="page-heading">
              <div>
                <span className="eyebrow">BẢNG TIN TUYỂN DỤNG</span>
                <h2>Khởi đầu từ một cơ hội.</h2>
                <p>Những công việc đang tìm kiếm ứng viên ngay lúc này.</p>
              </div>
            </section>

            <form className="search-strip" onSubmit={runSearch}>
              <label className="search-input"><Search size={18} /><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Chức danh, kỹ năng hoặc từ khóa" /></label>
              <label className="search-input"><Filter size={17} /><input value={category} onChange={event => setCategory(event.target.value)} placeholder="Danh mục" /></label>
              <label className="search-input"><MapPin size={17} /><input value={location} onChange={event => setLocation(event.target.value)} placeholder="Địa điểm" /></label>
              <button className="button button-green" type="submit">Tìm việc</button>
            </form>
            <JobScheduleFilter value={scheduleFilter} onChange={setScheduleFilter} />

            <div className="section-line">
              <div><span className="eyebrow">CƠ HỘI DÀNH CHO BẠN</span><h2>{displayJobs.length} công việc đang hiển thị</h2></div>
              <span className="sort-label">MỚI NHẤT <ChevronRight size={14} /></span>
            </div>

            <div className="job-list">
              {displayJobs.length === 0 ? <div className="empty-state"><BriefcaseBusiness size={28} /><h3>Chưa có công việc phù hợp</h3><p>Thử đổi từ khóa hoặc bộ lọc để tìm cơ hội khác.</p></div> :
                displayJobs.map((job, index) => <article className="job-row" key={job.id}>
                  <span className="job-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="job-main">
                    <div className="job-title-line"><h3>{job.title}</h3><span className={`status-tag ${job.status.toLowerCase()}`}>{statusLabels[job.status]}</span></div>
                    <p className="job-company">{job.employer?.employerProfile?.companyName || job.employer?.name || 'Nhà tuyển dụng'}</p>
                    <p className="job-description">{getJobSummary(job.description)}</p>
                    <div className="job-meta">
                      <span><MapPin size={14} />{job.location || 'Linh hoạt'}</span>
                      {job.category && <span>{job.category}</span>}
                      {job.salaryRange && <span>{job.salaryRange}</span>}
                      {job.workSchedule && <span>{job.workSchedule}</span>}
                      {(job.startDate || job.endDate) && <span>{formatJobDate(job.startDate)}{job.startDate && job.endDate ? ' – ' : ''}{formatJobDate(job.endDate)}</span>}
                    </div>
                  </div>
                  <div className="job-action">
                    <button className="text-action job-details-action" onClick={() => openPublicJob(job)}>Xem chi tiết <ChevronRight size={15} /></button>
                    {job.status === 'OPEN' && <button className="text-action" onClick={() => {
                      setApplyingTo(job)
                      setAuthMode('login')
                      setGuestAuthOpen(true)
                      setError('')
                    }}>Ứng tuyển <ArrowRight size={16} /></button>}
                  </div>
                </article>)
              }
            </div>

            <div className="public-bottom-cta">
              <p>Bạn đã tìm được công việc phù hợp?</p>
              <button className="button button-dark" onClick={() => {
                setAuthMode('register')
                setGuestAuthOpen(true)
              }}>Tạo tài khoản để ứng tuyển <ArrowRight size={16} /></button>
            </div>
          </div>
        </section>
        </>}

        <footer className="public-footer">
          <div className="footer-main">
            <div className="footer-brand">
              <a className="wordmark footer-logo" href="#top">
                <span className="brand-mark">c</span> ca làm
              </a>

              <p>Kết nối sinh viên với công việc linh hoạt để mỗi trải nghiệm hôm nay mở ra một bước tiến ngày mai.</p>

              <span className="footer-tagline">
                CÔNG VIỆC <i>·</i> TRẢI NGHIỆM <i>·</i> PHÁT TRIỂN
              </span>
            </div>

            <div className="footer-column">
              <h4>Khám phá</h4>
              <a href="#public-jobs">Tìm việc làm</a>
              <a href="#public-jobs">Việc làm part-time</a>
              <a href="#public-jobs">Cơ hội phù hợp</a>
            </div>

            <div className="footer-column">
              <h4>Dành cho bạn</h4>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setAuthRole('STUDENT')
                  setGuestAuthOpen(true)
                  setError('')
                }}
              >
                Sinh viên
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setAuthRole('EMPLOYER')
                  setGuestAuthOpen(true)
                  setError('')
                }}
              >
                Nhà tuyển dụng
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setGuestAuthOpen(true)
                  setError('')
                }}
              >
                Tạo tài khoản
              </button>
            </div>

            <div className="footer-join">
              <span className="footer-contact-label">SẴN SÀNG CHO BƯỚC TIẾP THEO?</span>
              <p>Tìm cơ hội phù hợp với lịch học và mục tiêu của bạn.</p>

              <button
                className="footer-register-link"
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setGuestAuthOpen(true)
                  setError('')
                }}
              >
                Tham gia ngay <ArrowRight size={15} />
              </button>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 Ca Làm. Bản quyền thuộc về Ca Làm.</span>
            <span>Đồng hành cùng hành trình nghề nghiệp của bạn.</span>
          </div>
        </footer>
      </main>
    )
  }

  const navItems: { id: View; label: string; icon: typeof BriefcaseBusiness; count?: number }[] = [
    ...(profile.role === 'EMPLOYER' ? [{ id: 'dashboard' as View, label: 'Tổng quan', icon: BriefcaseBusiness }] : []),
    { id: 'jobs', label: profile.role === 'EMPLOYER' ? 'Tin tuyển dụng' : 'Tìm việc', icon: BriefcaseBusiness },
    ...(profile.role === 'EMPLOYER' ? [{
      id: 'candidates' as View,
      label: 'Ứng viên',
      icon: ClipboardList,
      count: employerApplications.filter(application => application.status === 'PENDING').length,
    }] : []),
    ...(profile.role === 'STUDENT' ? [{
      id: 'applications' as View,
      label: 'Đơn ứng tuyển',
      icon: ClipboardList,
      count: applications.filter(application => application.status === 'PENDING').length,
    }] : []),
    { id: 'notifications', label: 'Thông báo', icon: Bell, count: notifications.filter(item => !item.read).length },
    { id: 'profile', label: 'Hồ sơ của tôi', icon: CircleUserRound },
  ]
  const pendingApplications = applications.filter(application => application.status === 'PENDING')
  const activeApplications = applications.filter(application => application.status === 'ACCEPTED' && (application.job?.workStage || 'HIRED') !== 'COMPLETED')
  const completedApplications = applications.filter(application => application.status === 'ACCEPTED' && application.job?.workStage === 'COMPLETED')
  const visibleApplications = applications.filter(application => {
    if (applicationFilter === 'pending') return application.status === 'PENDING'
    if (applicationFilter === 'active') return application.status === 'ACCEPTED' && (application.job?.workStage || 'HIRED') !== 'COMPLETED'
    if (applicationFilter === 'completed') return application.status === 'ACCEPTED' && application.job?.workStage === 'COMPLETED'
    return true
  })
  const applicationFilterOptions: { id: ApplicationFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Tất cả', count: applications.length },
    { id: 'pending', label: 'Chờ phản hồi', count: pendingApplications.length },
    { id: 'active', label: 'Đang làm', count: activeApplications.length },
    { id: 'completed', label: 'Hoàn thành', count: completedApplications.length },
  ]
  const visibleJobApplicants = applicants.filter(application => (
    (!candidateStatusFilter || application.status === candidateStatusFilter)
    && (!candidateKeyword.trim()
      || `${application.student?.name ?? ''} ${application.student?.email ?? ''} ${application.coverLetter ?? ''}`
        .toLowerCase().includes(candidateKeyword.trim().toLowerCase()))
  ))
  const visibleEmployerApplications = employerApplications.filter(application => (
    (!candidateJobFilter || application.job?.id === candidateJobFilter)
    && (!candidateStatusFilter || application.status === candidateStatusFilter)
    && (!candidateKeyword.trim()
      || `${application.student?.name ?? ''} ${application.student?.email ?? ''} ${application.coverLetter ?? ''} ${application.job?.title ?? ''}`
        .toLowerCase().includes(candidateKeyword.trim().toLowerCase()))
  ))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="wordmark" href="#home"><span className="brand-mark">c</span> ca làm</a>
        <div className="workspace-label">KHÔNG GIAN CỦA BẠN</div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} onClick={() => {
              setView(item.id)
              if (item.id === 'jobs') setSelectedJob(null)
            }}><Icon size={18} /><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-chip"><span className="avatar">{profile.name.slice(0, 1).toUpperCase()}</span><span><b>{profile.name}</b><small>{profile.role === 'STUDENT' ? 'Sinh viên' : 'Nhà tuyển dụng'}</small></span></div>
          <button className="signout-button" onClick={signOut}><LogOut size={16} /> Đăng xuất</button>
          <span className="sidebar-version">CA LÀM / 1.0</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-identity">
            <span className="topbar-kicker">{profile.role === 'STUDENT' ? 'KHÔNG GIAN SINH VIÊN' : 'KHÔNG GIAN NHÀ TUYỂN DỤNG'}</span>
            <span className="topbar-separator">/</span>
            <span>{profile.email}</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" title="Thông báo" aria-label={`Thông báo${notifications.some(item => !item.read) ? ', có thông báo chưa đọc' : ''}`} onClick={() => setView('notifications')}>
              <Bell size={18} />{notifications.some(item => !item.read) && <i />}
            </button>
            <button className="icon-button topbar-signout" title="Đăng xuất" aria-label="Đăng xuất" onClick={signOut}><LogOut size={17} /></button>
          </div>
        </header>
        <div className="content-wrap">
          {(notice || error) && <div className={error ? 'toast toast-error' : 'toast'} role={error ? 'alert' : 'status'}>{error || notice}<button onClick={() => { setError(''); setNotice('') }} aria-label="Đóng"><X size={15} /></button></div>}

          {view === 'dashboard' && profile.role === 'EMPLOYER' && <>
            <section className="page-heading">
              <div><span className="eyebrow">TỔNG QUAN TUYỂN DỤNG</span><h1>Xin chào, {profile.name}.</h1><p>Số liệu tổng hợp từ tin tuyển dụng và hồ sơ thuộc tài khoản của bạn.</p></div>
              <button className="button button-dark" onClick={() => { setEditingJob(null); setJobFormOpen(true); setView('jobs') }}><Plus size={17} /> Đăng tin mới</button>
            </section>
            {workspaceLoading && !employerStats ? <div className="empty-state" role="status"><BriefcaseBusiness size={28} /><h3>Đang tải tổng quan</h3></div> :
              employerStats ? <section className="employer-dashboard-grid" aria-label="Tổng quan tuyển dụng">
                {[
                  ['Tổng tin tuyển dụng', employerStats.totalJobs],
                  ['Tin đang tuyển', employerStats.openJobs],
                  ['Tin đã đóng', employerStats.closedJobs],
                  ['Tổng đơn ứng tuyển', employerStats.totalApplications],
                  ['Đơn đang chờ', employerStats.pendingApplications],
                  ['Ứng viên được nhận', employerStats.acceptedApplications],
                  ['Đang thực hiện', employerStats.inProgressJobs],
                  ['Đã hoàn thành', employerStats.completedJobs],
                ].map(([label, count]) => <article className="employer-stat-card" key={String(label)}><span>{label}</span><strong>{count}</strong></article>)}
              </section> : <div className="empty-state" role="alert"><BriefcaseBusiness size={28} /><h3>Không thể tải dữ liệu tổng quan</h3><p>{error || 'Vui lòng thử tải lại trang.'}</p></div>}
          </>}

          {view === 'jobs' && <>
            {profile.role === 'STUDENT' && !selectedJob && <section className="student-welcome">
              <div className="student-welcome-copy">
                <span className="eyebrow"><Sparkles size={14} /> KHÔNG GIAN CỦA BẠN</span>
                <h1>Chào {profile.name},<br /><em>mình cùng tìm ca phù hợp nhé.</em></h1>
                <p>Khám phá cơ hội mới, theo dõi đơn ứng tuyển và sắp xếp công việc quanh lịch học.</p>
                <div className="student-welcome-actions">
                  <button className="button student-welcome-primary" onClick={() => {
                    setView('applications')
                    setApplicationFilter('all')
                  }}>Theo dõi đơn ứng tuyển <ArrowRight size={16} /></button>
                  <button className="student-welcome-secondary" onClick={() => setView('profile')}>Cập nhật lịch rảnh</button>
                </div>
              </div>
              <div className="student-welcome-stats" aria-label="Tổng quan hoạt động">
                <div><span>Đang chờ phản hồi</span><strong>{workspaceLoading ? '—' : pendingApplications.length}</strong></div>
                <div><span>Đang làm việc</span><strong>{workspaceLoading ? '—' : activeApplications.length}</strong></div>
              </div>
            </section>}

            {profile.role === 'STUDENT' && selectedJob ? <section className="student-job-detail">
              <button className="student-detail-back" type="button" onClick={() => setSelectedJob(null)}><ArrowLeft size={16} /> Quay lại danh sách</button>
              <div className="student-detail-layout">
                <article className="student-detail-card">
                  <div className="student-detail-kicker">
                    <span className="eyebrow">CHI TIẾT CÔNG VIỆC</span>
                    <span className={`status-tag ${selectedJob.status.toLowerCase()}`}>{statusLabels[selectedJob.status]}</span>
                  </div>
                  <h1>{selectedJob.title}</h1>
                  <p className="student-detail-company">{selectedJob.employer?.employerProfile?.companyName || selectedJob.employer?.name || 'Nhà tuyển dụng'}</p>
                  <div className="student-detail-meta">
                    <span><MapPin size={15} />{selectedJob.location || 'Linh hoạt'}</span>
                    {selectedJob.category && <span>{selectedJob.category}</span>}
                    {selectedJob.salaryRange && <span>{selectedJob.salaryRange}</span>}
                    {selectedJob.workSchedule && <span>{selectedJob.workSchedule}</span>}
                    {(selectedJob.startDate || selectedJob.endDate) && <span>{formatJobDate(selectedJob.startDate)}{selectedJob.startDate && selectedJob.endDate ? ' – ' : ''}{formatJobDate(selectedJob.endDate)}</span>}
                  </div>
                  <section className="student-detail-description">
                    <h2>Mô tả công việc</h2>
                    <p>{selectedJob.description}</p>
                  </section>
                </article>
                <aside className="student-detail-apply">
                  <span className="eyebrow">CƠ HỘI DÀNH CHO BẠN</span>
                  <h2>{selectedJob.salaryRange || 'Mức lương trao đổi'}</h2>
                  <p>{selectedJob.workSchedule || 'Lịch làm việc linh hoạt'}</p>
                  {selectedJob.status === 'OPEN'
                    ? <button className="button button-wide" onClick={() => setApplyingTo(selectedJob)}>Ứng tuyển công việc <ArrowRight size={16} /></button>
                    : <p className="student-detail-closed">Công việc này hiện không nhận hồ sơ mới.</p>}
                </aside>
              </div>
            </section> : <>
            <section className="page-heading"><div><span className="eyebrow">{profile.role === 'EMPLOYER' ? 'DÀNH CHO NHÀ TUYỂN DỤNG' : 'CƠ HỘI MỚI MỖI NGÀY'}</span><h1>{profile.role === 'EMPLOYER' ? 'Quản lý tin tuyển dụng.' : <>Việc tốt, <em>đúng nhịp.</em></>}</h1><p>{profile.role === 'EMPLOYER' ? 'Theo dõi tin tuyển dụng và kết nối với những ứng viên phù hợp.' : 'Công việc part-time được chọn lọc cho lịch học của bạn.'}</p></div>{profile.role === 'EMPLOYER' && <button className="button button-dark" onClick={() => { setEditingJob(null); setJobFormOpen(value => !value) }}><Plus size={17} /> Đăng tin mới</button>}</section>
            <form className="search-strip" onSubmit={runSearch}><label className="search-input"><Search size={18} /><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Chức danh, kỹ năng hoặc từ khóa" /></label><label className="search-input"><Filter size={17} /><input value={category} onChange={event => setCategory(event.target.value)} placeholder="Danh mục" /></label><label className="search-input"><MapPin size={17} /><input value={location} onChange={event => setLocation(event.target.value)} placeholder="Địa điểm" /></label>{profile.role === 'EMPLOYER' && <label className="search-input"><Filter size={17} /><select value={jobStatusFilter} onChange={event => setJobStatusFilter(event.target.value)}><option value="">Mọi trạng thái</option><option value="OPEN">Đang tuyển</option><option value="FILLED">Đã đủ người</option><option value="CLOSED">Đã đóng</option><option value="COMPLETED">Hoàn thành</option></select></label>}<button className="button button-green" type="submit" disabled={searching}>{searching ? profile.role === 'EMPLOYER' ? 'Đang lọc...' : 'Đang tìm...' : profile.role === 'EMPLOYER' ? 'Lọc tin' : 'Tìm việc'}</button></form>
            {profile.role !== 'EMPLOYER' && <JobScheduleFilter value={scheduleFilter} onChange={setScheduleFilter} />}
            {jobFormOpen && <form className="job-composer" key={editingJob?.id ?? 'new-job'} onSubmit={submitJob}>
              <div className="composer-heading">
                <div><span className="eyebrow">TIN TUYỂN DỤNG</span><h3>{editingJob ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng một cơ hội mới'}</h3></div>
                <button type="button" className="icon-button" onClick={() => { setJobFormOpen(false); setEditingJob(null) }} aria-label="Đóng"><X size={17} /></button>
              </div>
              <div className="form-row">
                <label>Tiêu đề<input name="title" required defaultValue={editingJob?.title ?? ''} placeholder="Ví dụ: Trợ lý nội dung part-time" /></label>
                <label>Danh mục<input name="category" defaultValue={editingJob?.category ?? ''} placeholder="Marketing, Thiết kế..." /></label>
              </div>
              <label>Mô tả công việc<textarea name="description" required rows={3} defaultValue={editingJob?.description ?? ''} /></label>
              <div className="form-row">
                <label>Địa điểm<input name="location" defaultValue={editingJob?.location ?? ''} /></label>
                <label>Mức lương<input name="salaryRange" defaultValue={editingJob?.salaryRange ?? ''} /></label>
              </div>
              <JobScheduleField initial={editingJob?.workSchedule} />
              <div className="form-row">
                <label>Thời gian bắt đầu<input name="startDate" type="datetime-local" defaultValue={editingJob?.startDate?.slice(0, 16) ?? ''} /></label>
                <label>Thời gian kết thúc<input name="endDate" type="datetime-local" defaultValue={editingJob?.endDate?.slice(0, 16) ?? ''} /></label>
              </div>
              <button className="button button-green" type="submit" disabled={busyAction === 'job-form'}>{busyAction === 'job-form' ? 'Đang lưu...' : editingJob ? 'Lưu thay đổi' : 'Đăng tin'} <ArrowRight size={16} /></button>
            </form>}
            <div className="section-line"><div><span className="eyebrow">{profile.role === 'EMPLOYER' ? 'TIN CỦA BẠN' : 'BẢNG TIN'}</span><h2>{workspaceLoading && displayJobs.length === 0 ? 'Đang tải việc làm' : profile.role === 'EMPLOYER' ? `${displayJobs.length} tin đang hiển thị` : `${displayJobs.length} cơ hội đang hiển thị`}</h2></div><span className="sort-label">MỚI NHẤT <ChevronRight size={14} /></span></div>
            <div className={profile.role === 'STUDENT' ? 'job-list student-job-list' : profile.role === 'EMPLOYER' ? 'job-list employer-job-list' : 'job-list'}>
              {workspaceLoading && displayJobs.length === 0 ? <div className="empty-state" role="status"><BriefcaseBusiness size={28} /><h3>Đang tải việc làm</h3><p>Cơ hội phù hợp sẽ sớm xuất hiện.</p></div> :
                displayJobs.length === 0 ? <div className="empty-state"><BriefcaseBusiness size={28} /><h3>{profile.role === 'EMPLOYER' ? 'Bạn chưa có tin tuyển dụng' : 'Chưa có công việc phù hợp'}</h3><p>{profile.role === 'EMPLOYER' ? 'Đăng tin để bắt đầu kết nối với ứng viên.' : 'Thử đổi từ khóa hoặc bộ lọc để tìm cơ hội khác.'}</p></div> :
                displayJobs.map(job => <Fragment><article className={profile.role === 'STUDENT' ? 'job-row student-job-card' : profile.role === 'EMPLOYER' ? `job-row employer-job-card${job.status === 'CLOSED' ? ' is-closed' : job.status === 'COMPLETED' ? ' is-completed' : ''}` : 'job-row'}>
                  <div className="job-main">
                    <div className="job-title-line">{profile.role === 'EMPLOYER' && <span className="employer-job-icon"><BriefcaseBusiness size={16} /></span>}<h3>{job.title}</h3><span className={`status-tag ${job.status.toLowerCase()}`}>{statusLabels[job.status]}</span></div>
                    <p className="job-company">{job.employer?.employerProfile?.companyName || job.employer?.name || 'Nhà tuyển dụng'}</p>
                    <p className="job-description">{getJobSummary(job.description)}</p>
                    <div className="job-meta"><span><MapPin size={14} />{job.location || 'Linh hoạt'}</span>{job.category && <span>{job.category}</span>}{job.salaryRange && <span>{job.salaryRange}</span>}{job.workSchedule && <span>{job.workSchedule}</span>}{profile.role === 'EMPLOYER' && <span><ClipboardList size={14} />{employerApplications.filter(application => application.job?.id === job.id).length} hồ sơ</span>}</div>
                  </div>
                  {profile.role === 'EMPLOYER' && job.employer?.id === profile.id && <div className="job-progress">
                    <div className="job-progress-summary"><b>Tiến độ công việc</b><span>{workStageLabels[job.workStage || 'RECRUITING']}</span></div>
                    {(job.workStage === 'HIRED' || job.workStage === 'IN_PROGRESS') && <button className="text-action progress-action" disabled={busyAction === `progress:${job.id}`} onClick={() => advanceJob(job)}>{busyAction === `progress:${job.id}` ? 'Đang cập nhật...' : <>Chuyển sang {job.workStage === 'HIRED' ? 'Đang thực hiện' : 'Hoàn thành'} <ArrowRight size={15} /></>}</button>}
                  </div>}
                  <div className="job-action">
                    {profile.role === 'STUDENT' && <button className="text-action student-job-details-action" onClick={() => setSelectedJob(job)}>Xem chi tiết <ChevronRight size={15} /></button>}
                    {profile.role === 'STUDENT' && job.status === 'OPEN' && <button className="text-action" onClick={() => setApplyingTo(job)}>Ứng tuyển <ArrowRight size={16} /></button>}
                    {profile.role === 'EMPLOYER' && job.employer?.id === profile.id && <>
                      <button className="text-action employer-secondary-action" onClick={() => setSelectedJob(job)}>Chi tiết</button>
                      <button className="text-action employer-primary-action" disabled={busyAction === `applicants:${job.id}`} onClick={() => openApplicants(job)}>{busyAction === `applicants:${job.id}` ? 'Đang tải...' : <>Ứng viên <ArrowRight size={16} /></>}</button>
                      {job.status !== 'CLOSED' && job.status !== 'COMPLETED' && <button className="text-action employer-secondary-action" onClick={() => editJob(job)}>Chỉnh sửa</button>}
                      {(job.status === 'OPEN' || job.status === 'FILLED') && <button className="text-action danger-action" disabled={busyAction === `close:${job.id}`} onClick={() => closeJob(job)}>{busyAction === `close:${job.id}` ? 'Đang đóng...' : 'Đóng tin tuyển dụng'}</button>}
                      {(job.status === 'OPEN' || job.status === 'FILLED') && <button className="text-action danger-action" disabled={busyAction === `delete:${job.id}`} onClick={() => deleteJob(job)}>{busyAction === `delete:${job.id}` ? 'Đang xóa...' : 'Xóa tin'}</button>}
                    </>}
                  </div>
                </article>
            {profile.role === 'EMPLOYER' && selectedJob?.id === job.id && <section className="detail-panel inline-detail-panel" id={`job-panel-${job.id}`}>
              <div className="composer-heading"><div><span className="eyebrow">CHI TIẾT TIN TUYỂN DỤNG</span><h3>{selectedJob.title}</h3></div><button className="icon-button" onClick={() => setSelectedJob(null)} aria-label="Đóng"><X size={17} /></button></div>
              <p>{selectedJob.description}</p>
              <div className="job-meta"><span>{statusLabels[selectedJob.status]}</span>{selectedJob.category && <span>{selectedJob.category}</span>}{selectedJob.location && <span>{selectedJob.location}</span>}{selectedJob.salaryRange && <span>{selectedJob.salaryRange}</span>}{selectedJob.workSchedule && <span>{selectedJob.workSchedule}</span>}</div>
            </section>}
            {applicantsFor?.id === job.id && <section className="detail-panel inline-detail-panel" id={`job-applicants-${job.id}`}>
              <div className="composer-heading"><div><span className="eyebrow">HỒ SƠ ỨNG TUYỂN</span><h3>{applicantsFor.title}</h3><p>Giai đoạn: {workStageLabels[applicantsFor.workStage || 'RECRUITING']}</p></div><button className="icon-button" onClick={() => setApplicantsFor(null)} aria-label="Đóng"><X size={17} /></button></div>
              <div className="candidate-filter-row">
                <label className="search-input"><Search size={16} /><input value={candidateKeyword} onChange={event => setCandidateKeyword(event.target.value)} placeholder="Tìm ứng viên..." /></label>
                <label className="search-input"><Filter size={16} /><select value={candidateStatusFilter} onChange={event => setCandidateStatusFilter(event.target.value)}><option value="">Mọi trạng thái</option><option value="PENDING">Đang chờ</option><option value="ACCEPTED">Đã nhận</option><option value="REJECTED">Đã từ chối</option><option value="CANCELLED">Đã hủy</option></select></label>
              </div>
              {visibleJobApplicants.length ? visibleJobApplicants.map(application => {
                const reviews = workReviews[application.id] ?? []
                const submitted = reviews.find(review => review.reviewerId === profile.id)
                const studentProfile = application.student?.studentProfile
                const availability = studentProfile?.availability ?? application.student?.availability ?? []
                const cvUrl = application.cvUrl || studentProfile?.cvUrl || application.student?.cvUrl
                const safeCvUrl = getSafeExternalUrl(cvUrl)
                return <div className="applicant-row" key={application.id}>
                  <div><b>{application.student?.name}</b><small>{application.student?.email} · {application.coverLetter}</small>
                    {studentProfile?.bio && <small>Giới thiệu: {studentProfile.bio}</small>}
                    {studentProfile?.skills && <small>Kỹ năng: {studentProfile.skills}</small>}
                    {studentProfile?.address && <small>Địa chỉ: {studentProfile.address}</small>}
                    {cvUrl && <small>CV: {safeCvUrl
                      ? <a href={safeCvUrl} target="_blank" rel="noreferrer">Mở liên kết CV</a>
                      : cvUrl}</small>}
                    {!!availability.length && <small className="applicant-availability">
                      Khung giờ có thể làm: {availability.map(slot => `${weekdays.find(day => day.value === slot.day)?.label ?? slot.day} ${slot.startTime}–${slot.endTime}`).join(' · ')}
                    </small>}
                  </div>
                  <span className={`status-tag ${application.status.toLowerCase()}`}>{statusLabels[application.status]}</span>
                  {application.status === 'PENDING' && <div className="row-actions"><button className="small-button accept" disabled={busyAction === `status:${application.id}`} onClick={() => changeApplicationStatus(application, 'ACCEPTED')}><Check size={14} /> Nhận</button><button className="small-button reject" disabled={busyAction === `status:${application.id}`} onClick={() => changeApplicationStatus(application, 'REJECTED')}>Từ chối</button></div>}
                  {application.status === 'ACCEPTED' && <ContactApplicant application={application} employer={profile} />}
                  {application.status === 'ACCEPTED' && applicantsFor.workStage === 'COMPLETED' && (submitted
                    ? <p className="review-confirmation">Đã đánh giá: {submitted.rating}/5 · {submitted.comment || 'Không có nhận xét'}</p>
                    : <form className="inline-review-form" onSubmit={event => submitReview(event, application)}>
                        <label>Đánh giá sinh viên<select name="rating" defaultValue="5"><option value="5">5 sao</option><option value="4">4 sao</option><option value="3">3 sao</option><option value="2">2 sao</option><option value="1">1 sao</option></select></label>
                        <label>Nhận xét<textarea name="comment" maxLength={2000} rows={2} placeholder="Chia sẻ về chất lượng và tinh thần làm việc..." /></label>
                        <button className="small-button accept" type="submit" disabled={busyAction === `review:${application.id}`}>{busyAction === `review:${application.id}` ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
                      </form>)}
                </div>
              }) : <p className="muted-copy">{applicants.length ? 'Không có hồ sơ phù hợp bộ lọc.' : 'Chưa có hồ sơ ứng tuyển.'}</p>}
            </section>}
                </Fragment>)
              }
            </div>
            </>}
          </>}

          {view === 'candidates' && profile.role === 'EMPLOYER' && <>
            <section className="page-heading"><div><span className="eyebrow">HỒ SƠ ỨNG TUYỂN</span><h1>Quản lý ứng viên</h1><p>Chỉ hiển thị hồ sơ nộp vào các tin thuộc tài khoản của bạn.</p></div></section>
            <div className="candidate-filter-row">
              <label className="search-input"><Search size={16} /><input value={candidateKeyword} onChange={event => setCandidateKeyword(event.target.value)} placeholder="Tìm theo ứng viên, email, tin..." /></label>
              <label className="search-input"><Filter size={16} /><select value={candidateJobFilter} onChange={event => setCandidateJobFilter(event.target.value)}><option value="">Mọi tin tuyển dụng</option>{jobs.map(job => <option value={job.id} key={job.id}>{job.title}</option>)}</select></label>
              <label className="search-input"><Filter size={16} /><select value={candidateStatusFilter} onChange={event => setCandidateStatusFilter(event.target.value)}><option value="">Mọi trạng thái</option><option value="PENDING">Đang chờ</option><option value="ACCEPTED">Đã nhận</option><option value="REJECTED">Đã từ chối</option><option value="CANCELLED">Đã hủy</option></select></label>
            </div>
            {workspaceLoading && employerApplications.length === 0 ? <div className="empty-state" role="status"><ClipboardList size={28} /><h3>Đang tải hồ sơ</h3></div> :
              visibleEmployerApplications.length ? <div className="employer-candidate-list">
                {visibleEmployerApplications.map(application => {
                  const studentProfile = application.student?.studentProfile
                  const cvUrl = application.cvUrl || studentProfile?.cvUrl || application.student?.cvUrl
                  const safeCvUrl = getSafeExternalUrl(cvUrl)
                  const submitted = (workReviews[application.id] ?? []).find(review => review.reviewerId === profile.id)
                  return <article className="employer-candidate-card" key={application.id}>
                    <div className="employer-candidate-heading">
                      <div><h3>{application.student?.name || 'Ứng viên'}</h3><p>{application.student?.email} · {application.job?.title}</p></div>
                      <span className={`status-tag ${application.status.toLowerCase()}`}>{statusLabels[application.status]}</span>
                    </div>
                    {application.coverLetter && <p><b>Lời giới thiệu:</b> {application.coverLetter}</p>}
                    {studentProfile?.bio && <p><b>Giới thiệu:</b> {studentProfile.bio}</p>}
                    {studentProfile?.skills && <p><b>Kỹ năng:</b> {studentProfile.skills}</p>}
                    {studentProfile?.address && <p><b>Địa chỉ:</b> {studentProfile.address}</p>}
                    {cvUrl && <p><b>CV:</b> {safeCvUrl ? <a href={safeCvUrl} target="_blank" rel="noreferrer">Mở liên kết CV</a> : cvUrl}</p>}
                    {application.status === 'PENDING' && <div className="row-actions">
                      <button className="small-button accept" disabled={busyAction === `status:${application.id}`} onClick={() => changeApplicationStatus(application, 'ACCEPTED')}><Check size={14} /> Nhận</button>
                      <button className="small-button reject" disabled={busyAction === `status:${application.id}`} onClick={() => changeApplicationStatus(application, 'REJECTED')}>Từ chối</button>
                    </div>}
                    {application.status === 'ACCEPTED' && <ContactApplicant application={application} employer={profile} />}
                    {application.status === 'ACCEPTED' && application.job?.workStage === 'COMPLETED' && (submitted
                      ? <p className="review-confirmation">Đã đánh giá sinh viên: {submitted.rating}/5 · {submitted.comment || 'Không có nhận xét'}</p>
                      : <form className="inline-review-form" onSubmit={event => submitReview(event, application)}>
                          <label>Điểm đánh giá<select name="rating" defaultValue="5"><option value="5">5 sao</option><option value="4">4 sao</option><option value="3">3 sao</option><option value="2">2 sao</option><option value="1">1 sao</option></select></label>
                          <label>Nhận xét<textarea name="comment" maxLength={2000} rows={2} placeholder="Nhận xét về sinh viên..." /></label>
                          <button className="small-button accept" type="submit" disabled={busyAction === `review:${application.id}`}>{busyAction === `review:${application.id}` ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
                        </form>)}
                  </article>
                })}
              </div> : <div className="empty-state"><ClipboardList size={28} /><h3>{employerApplications.length ? 'Không có hồ sơ phù hợp' : 'Chưa có đơn ứng tuyển'}</h3><p>Hồ sơ mới sẽ xuất hiện khi sinh viên ứng tuyển vào tin của bạn.</p></div>}
          </>}

          {view === 'applications' && <>
            <section className="page-heading"><div><span className="eyebrow">THEO DÕI TIẾN ĐỘ</span><h1>Đơn ứng tuyển</h1><p>Mỗi lần bắt đầu là một bước tiến mới.</p></div></section>
            <div className="application-filters" role="group" aria-label="Lọc đơn ứng tuyển">
              {applicationFilterOptions.map(option => <button
                key={option.id}
                type="button"
                aria-pressed={applicationFilter === option.id}
                className={applicationFilter === option.id ? 'selected' : ''}
                onClick={() => setApplicationFilter(option.id)}
              >
                {option.label}<span>{workspaceLoading ? '—' : option.count}</span>
              </button>)}
            </div>
            <div className="application-list">
              {workspaceLoading ? <div className="empty-state" role="status"><ClipboardList size={28} /><h3>Đang tải đơn ứng tuyển</h3><p>Đang đồng bộ tiến độ mới nhất.</p></div> :
                visibleApplications.length ? visibleApplications.map(application => {
                const stage = application.job?.workStage || (application.status === 'ACCEPTED' ? 'HIRED' : 'RECRUITING')
                return <article className="application-card" key={application.id}>
                  <div className="application-card-main">
                    <span className="eyebrow">{application.job?.category || 'CÔNG VIỆC'}</span>
                    <h3>{application.job?.title}</h3>
                    <p>{application.job?.employer?.employerProfile?.companyName || application.job?.employer?.name || 'Nhà tuyển dụng'} · {application.job?.location || 'Linh hoạt'}</p>
                    {application.status === 'ACCEPTED' && <div className="student-work-progress">
                      <b>Công việc của tôi · {workStageLabels[stage]}</b>
                      <div className="work-stage-track">
                        {(['HIRED', 'IN_PROGRESS', 'COMPLETED'] as const).map((step, index) => {
                          const currentIndex = stage === 'RECRUITING' ? -1 : (['HIRED', 'IN_PROGRESS', 'COMPLETED'] as const).indexOf(stage as 'HIRED' | 'IN_PROGRESS' | 'COMPLETED')
                          return <span key={step} className={index <= currentIndex ? 'reached' : ''}>{workStageLabels[step]}</span>
                        })}
                      </div>
                    </div>}
                    {application.status === 'PENDING' && <button className="small-button reject" disabled={busyAction === `cancel:${application.id}`} onClick={() => cancelApplication(application)}>{busyAction === `cancel:${application.id}` ? 'Đang hủy...' : 'Hủy đơn'}</button>}
                  </div>
                  <span className={`status-tag ${application.status.toLowerCase()}`}>{statusLabels[application.status]}</span>
                </article>
              }) : applicationFilter === 'all' ? <div className="empty-state"><ClipboardList size={28} /><h3>Chưa có đơn ứng tuyển</h3><p>Những công việc bạn ứng tuyển sẽ xuất hiện tại đây.</p><button className="text-action" onClick={() => setView('jobs')}>Khám phá việc làm <ArrowRight size={16} /></button></div> : <div className="empty-state"><ClipboardList size={28} /><h3>Chưa có đơn trong mục này</h3><p>Các đơn ứng tuyển khác vẫn được giữ trong mục “Tất cả”.</p><button className="text-action" onClick={() => setApplicationFilter('all')}>Xem tất cả đơn <ArrowRight size={16} /></button></div>}
            </div>
            {(applicationFilter === 'all' || applicationFilter === 'completed') && applications.some(application => application.status === 'ACCEPTED' && application.job?.workStage === 'COMPLETED') && <section className="completed-work-section">
              <div className="section-line"><div><span className="eyebrow">HÀNH TRÌNH ĐÃ HOÀN THÀNH</span><h2>Công việc đã hoàn thành</h2></div></div>
              {applications.filter(application => application.status === 'ACCEPTED' && application.job?.workStage === 'COMPLETED').map(application => {
                const reviews = workReviews[application.id] ?? []
                const ownReview = reviews.find(review => review.reviewerId === profile.id)
                return <article className="completed-work-card" key={application.id}>
                  <div><h3>{application.job.title}</h3><p>{application.job.employer?.employerProfile?.companyName || application.job.employer?.name || 'Nhà tuyển dụng'}</p><div className="work-stage-track">{(['HIRED', 'IN_PROGRESS', 'COMPLETED'] as const).map(step => <span className="reached" key={step}>{workStageLabels[step]}</span>)}</div></div>
                  {ownReview ? <p className="review-confirmation">Bạn đã đánh giá nhà tuyển dụng: {ownReview.rating}/5 · {ownReview.comment || 'Không có nhận xét'}</p> : <form className="inline-review-form" onSubmit={event => submitReview(event, application)}>
                    <label>Đánh giá nhà tuyển dụng<select name="rating" defaultValue="5"><option value="5">5 sao</option><option value="4">4 sao</option><option value="3">3 sao</option><option value="2">2 sao</option><option value="1">1 sao</option></select></label>
                    <label>Chia sẻ trải nghiệm<textarea name="comment" maxLength={2000} rows={2} placeholder="Nhận xét về giao tiếp, môi trường làm việc..." /></label>
                    <button className="small-button accept" type="submit" disabled={busyAction === `review:${application.id}`}>{busyAction === `review:${application.id}` ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
                  </form>}
                </article>
              })}
            </section>}
          </>}

          {view === 'notifications' && <>
            <section className="page-heading"><div><span className="eyebrow">CẬP NHẬT CỦA BẠN</span><h1>Thông báo</h1><p>Tin mới về công việc và hoạt động trên Ca Làm.</p></div></section>
            <div className="notification-list">
              {workspaceLoading ? <div className="empty-state" role="status"><Bell size={28} /><h3>Đang tải thông báo</h3><p>Đang kiểm tra các cập nhật mới.</p></div> :
                notifications.length ? notifications.map(item => <article className={item.read ? 'notification-row read' : 'notification-row'} key={item.id}>
                  <span className="notification-dot"><Bell size={17} /></span>
                  <div><h3>{item.title}</h3><p>{item.content}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'Vừa cập nhật'}</small></div>
                  {!item.read && <button className="small-button" onClick={() => markRead(item)}>Đánh dấu đã đọc</button>}
                </article>) : <div className="empty-state"><Bell size={28} /><h3>Chưa có thông báo</h3><p>Chúng tôi sẽ cập nhật khi có hoạt động mới.</p></div>}
            </div>
          </>}

          {view === 'profile' && <>
            <section className="page-heading">
              <div>
                <span className="eyebrow">THÔNG TIN CÁ NHÂN</span>
                <h1>Hồ sơ của tôi</h1>
                <p>Giữ hồ sơ rõ ràng để kết nối hiệu quả hơn.</p>
              </div>
            </section>
            <form className="profile-form" onSubmit={updateProfile}>
              <div className="profile-banner">
                <span className="avatar avatar-large">{profile.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <h2>{profile.name}</h2>
                  <p>{profile.email} · {profile.role === 'STUDENT' ? 'Sinh viên' : 'Nhà tuyển dụng'}</p>
                </div>
              </div>
              <div className="form-row">
                <label>Họ và tên<input name="name" defaultValue={profile.name} /></label>
                <label>Số điện thoại<input name="phone" defaultValue={profile.phone} /></label>
              </div>
              {profile.role === 'STUDENT' ? <>
                <label>Giới thiệu<textarea name="bio" rows={3} defaultValue={profile.bio} /></label>
                <div className="form-row">
                  <label>Địa chỉ<input name="address" defaultValue={profile.address} /></label>
                  <label>Kỹ năng<input name="skills" defaultValue={profile.skills} /></label>
                </div>
                <label>Liên kết CV<input name="cvUrl" defaultValue={profile.cvUrl} /></label>
                <AvailabilityEditor value={profileAvailability} onChange={setProfileAvailability} />
              </> : <>
                <label>Tên công ty<input name="companyName" defaultValue={profile.companyName} /></label>
                <label>Mô tả<textarea name="description" rows={3} defaultValue={profile.description} /></label>
                <div className="form-row">
                  <label>Website<input name="website" defaultValue={profile.website} /></label>
                  <label>Địa điểm<input name="location" defaultValue={profile.location} /></label>
                </div>
              </>}
              <button className="button button-dark" type="submit" disabled={busyAction === 'profile-form'}>{busyAction === 'profile-form' ? 'Đang lưu...' : 'Lưu hồ sơ'} <Check size={16} /></button>
            </form>
          </>}
        </div>
      </main>

      {applyingTo && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setApplyingTo(null) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="apply-title"><div className="composer-heading"><div><span className="eyebrow">ỨNG TUYỂN</span><h2 id="apply-title">{applyingTo.title}</h2></div><button className="icon-button" onClick={() => setApplyingTo(null)} aria-label="Đóng"><X size={17} /></button></div><form className="stack-form" onSubmit={submitApplication}><label>Liên kết CV<input name="cvUrl" defaultValue={profile.cvUrl || ''} placeholder="https://..." /></label><label>Lời nhắn<textarea name="coverLetter" required minLength={10} rows={5} placeholder="Giới thiệu ngắn gọn vì sao bạn phù hợp với công việc này." /></label><button className="button button-green button-wide" type="submit" disabled={busyAction === 'application-form'}>{busyAction === 'application-form' ? 'Đang gửi...' : 'Gửi đơn ứng tuyển'} <ArrowRight size={16} /></button></form></section></div>}
    </div>
  )
}