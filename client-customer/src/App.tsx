import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight, Bell, BriefcaseBusiness, Check, ChevronRight, CircleUserRound,
  ClipboardList, Filter, LogOut, MapPin, Plus, Search, ShieldCheck, Sparkles,
  X,
} from 'lucide-react'
import { api, type Application, type Job, type Notification, type Profile, type Role } from './api'

type View = 'jobs' | 'applications' | 'notifications' | 'profile'
type AuthData = { token: string; role: Role; email: string; name: string }

const statusLabels: Record<string, string> = {
  OPEN: 'Đang tuyển', FILLED: 'Đã đủ người', COMPLETED: 'Hoàn tất', CLOSED: 'Đã đóng',
  PENDING: 'Đang chờ', ACCEPTED: 'Được nhận', REJECTED: 'Chưa phù hợp',
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('fm.customer.token'))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [view, setView] = useState<View>('jobs')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authRole, setAuthRole] = useState<'STUDENT' | 'EMPLOYER'>('STUDENT')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [jobFormOpen, setJobFormOpen] = useState(false)
  const [applyingTo, setApplyingTo] = useState<Job | null>(null)
  const [applicantsFor, setApplicantsFor] = useState<Job | null>(null)
  const [applicants, setApplicants] = useState<Application[]>([])

  async function loadJobs(filters = '') {
    const result = await api<Job[]>(`/jobs${filters}`)
    setJobs(result.data)
  }

  async function loadWorkspace(currentProfile: Profile) {
    const tasks: Promise<unknown>[] = [loadJobs()]
    if (currentProfile.role === 'STUDENT') {
      tasks.push(api<Application[]>('/applications/my').then(result => setApplications(result.data)))
    }
    tasks.push(api<Notification[]>('/notifications').then(result => setNotifications(result.data)))
    await Promise.all(tasks)
  }

  useEffect(() => {
    if (!token) return
    api<Profile>('/users/me')
      .then(async result => {
        setProfile(result.data)
        await loadWorkspace(result.data)
      })
      .catch(() => {
        localStorage.removeItem('fm.customer.token')
        setToken(null)
        setProfile(null)
      })
  }, [token])

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
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
        }
    try {
      const result = await api<AuthData>(`/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', body: JSON.stringify(payload),
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
    try {
      await loadJobs(params.size ? `?${params.toString()}` : '')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tìm việc')
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!applyingTo) return
    const form = new FormData(event.currentTarget)
    try {
      await api<Application>('/applications', {
        method: 'POST',
        body: JSON.stringify({ jobId: applyingTo.id, cvUrl: String(form.get('cvUrl')), coverLetter: String(form.get('coverLetter')) }),
      })
      setApplyingTo(null)
      setNotice('Đơn ứng tuyển đã được gửi')
      if (profile) await loadWorkspace(profile)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể gửi đơn')
    }
  }

  async function submitJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    try {
      await api<Job>('/jobs', { method: 'POST', body: JSON.stringify(payload) })
      setJobFormOpen(false)
      setNotice('Tin tuyển dụng đã được đăng')
      await loadJobs()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đăng tin')
    }
  }

  async function openApplicants(job: Job) {
    setApplicantsFor(job)
    try {
      const result = await api<Application[]>(`/jobs/${job.id}/applications`)
      setApplicants(result.data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải hồ sơ ứng tuyển')
    }
  }

  async function changeApplicationStatus(application: Application, status: 'ACCEPTED' | 'REJECTED') {
    try {
      await api<Application>(`/applications/${application.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
      if (applicantsFor) await openApplicants(applicantsFor)
      await loadJobs()
      setNotice(status === 'ACCEPTED' ? 'Đã chấp nhận ứng viên' : 'Đã cập nhật hồ sơ ứng viên')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật hồ sơ')
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    try {
      await api('/users/me', { method: 'PUT', body: JSON.stringify(payload) })
      const result = await api<Profile>('/users/me')
      setProfile(result.data)
      setNotice('Hồ sơ đã được cập nhật')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu hồ sơ')
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
    setView('jobs')
  }

  if (!profile) {
    return (
      <main className="auth-layout">
        <section className="auth-story">
          <a className="wordmark" href="#top"><span className="brand-mark">c</span> ca làm</a>
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
            <div className="auth-heading">
              <span className="eyebrow">{authMode === 'login' ? 'CHÀO MỪNG QUAY LẠI' : 'BẮT ĐẦU HÀNH TRÌNH'}</span>
              <h2>{authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
              <p>{authMode === 'login' ? 'Tiếp tục khám phá cơ hội phù hợp với bạn.' : 'Một hồ sơ tốt mở ra những cơ hội tốt.'}</p>
            </div>
            <div className="auth-tabs" role="tablist">
              <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Đăng nhập</button>
              <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Đăng ký</button>
            </div>
            <form className="stack-form" onSubmit={handleAuth}>
              {authMode === 'register' ? <>
                <div className="role-switch" aria-label="Loại tài khoản">
                  <button type="button" className={authRole === 'STUDENT' ? 'selected' : ''} onClick={() => setAuthRole('STUDENT')}>Sinh viên</button>
                  <button type="button" className={authRole === 'EMPLOYER' ? 'selected' : ''} onClick={() => setAuthRole('EMPLOYER')}>Nhà tuyển dụng</button>
                </div>
                <label>Họ và tên<input name="name" required placeholder="Nguyễn Minh Anh" /></label>
                <label>Email<input name="email" type="email" required placeholder="ban@email.com" /></label>
                <div className="form-row"><label>Tên người dùng<input name="username" placeholder="minhanh" /></label><label>Số điện thoại<input name="phone" placeholder="09xx xxx xxx" /></label></div>
              </> : <label>Email hoặc tên người dùng<input name="identity" required autoComplete="username" placeholder="ban@email.com" /></label>}
              <label>Mật khẩu<input name="password" type="password" required minLength={6} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder="Ít nhất 6 ký tự" /></label>
              {error && <div className="inline-error" role="alert">{error}</div>}
              <button className="button button-dark button-wide" disabled={busy} type="submit">{busy ? 'Đang xử lý...' : authMode === 'login' ? 'Vào Ca Làm' : 'Tạo tài khoản'}<ArrowRight size={17} /></button>
            </form>
            <p className="auth-note"><ShieldCheck size={15} /> Tài khoản được bảo vệ bằng xác thực JWT.</p>
          </div>
          <div className="auth-bottom"><span>© 2026 CA LÀM</span><span>HỖ TRỢ / ĐIỀU KHOẢN</span></div>
        </section>
      </main>
    )
  }

  const navItems: { id: View; label: string; icon: typeof BriefcaseBusiness; count?: number }[] = [
    { id: 'jobs', label: profile.role === 'EMPLOYER' ? 'Tin tuyển dụng' : 'Tìm việc', icon: BriefcaseBusiness },
    ...(profile.role === 'STUDENT' ? [{ id: 'applications' as View, label: 'Đơn ứng tuyển', icon: ClipboardList }] : []),
    { id: 'notifications', label: 'Thông báo', icon: Bell, count: notifications.filter(item => !item.read).length },
    { id: 'profile', label: 'Hồ sơ của tôi', icon: CircleUserRound },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="wordmark" href="#home"><span className="brand-mark">c</span> ca làm</a>
        <div className="workspace-label">KHÔNG GIAN CỦA BẠN</div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setView(item.id)}><Icon size={18} /><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-chip"><span className="avatar">{profile.name.slice(0, 1).toUpperCase()}</span><span><b>{profile.name}</b><small>{profile.role === 'STUDENT' ? 'Sinh viên' : 'Nhà tuyển dụng'}</small></span></div>
          <button className="signout-button" onClick={signOut}><LogOut size={16} /> Đăng xuất</button>
          <span className="sidebar-version">CA LÀM / 1.0</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar"><div><span className="topbar-kicker">THỨ NĂM, 01 THÁNG 10, 2026</span><span className="topbar-separator">/</span><span>{profile.email}</span></div><div className="topbar-actions"><button className="icon-button" title="Thông báo" aria-label="Thông báo" onClick={() => setView('notifications')}><Bell size={18} />{notifications.some(item => !item.read) && <i />}</button><button className="icon-button" title="Đăng xuất" aria-label="Đăng xuất" onClick={signOut}><LogOut size={17} /></button></div></header>
        <div className="content-wrap">
          {(notice || error) && <div className={error ? 'toast toast-error' : 'toast'} role="status">{error || notice}<button onClick={() => { setError(''); setNotice('') }} aria-label="Đóng"><X size={15} /></button></div>}

          {view === 'jobs' && <>
            <section className="page-heading"><div><span className="eyebrow">{profile.role === 'EMPLOYER' ? 'DÀNH CHO NHÀ TUYỂN DỤNG' : 'CƠ HỘI MỚI MỖI NGÀY'}</span><h1>{profile.role === 'EMPLOYER' ? 'Tìm cộng sự phù hợp.' : <>Việc tốt, <em>đúng nhịp.</em></>}</h1><p>{profile.role === 'EMPLOYER' ? 'Đăng việc linh hoạt và tìm những bạn trẻ sẵn sàng bắt đầu.' : 'Công việc part-time được chọn lọc cho lịch học của bạn.'}</p></div>{profile.role === 'EMPLOYER' && <button className="button button-dark" onClick={() => setJobFormOpen(value => !value)}><Plus size={17} /> Đăng tin mới</button>}</section>
            <form className="search-strip" onSubmit={runSearch}><label className="search-input"><Search size={18} /><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Chức danh, kỹ năng hoặc từ khóa" /></label><label className="search-input"><Filter size={17} /><input value={category} onChange={event => setCategory(event.target.value)} placeholder="Danh mục" /></label><label className="search-input"><MapPin size={17} /><input value={location} onChange={event => setLocation(event.target.value)} placeholder="Địa điểm" /></label><button className="button button-green" type="submit">Tìm việc</button></form>
            {jobFormOpen && <form className="job-composer" onSubmit={submitJob}><div className="composer-heading"><div><span className="eyebrow">TIN TUYỂN DỤNG</span><h3>Đăng một cơ hội mới</h3></div><button type="button" className="icon-button" onClick={() => setJobFormOpen(false)} aria-label="Đóng"><X size={17} /></button></div><div className="form-row"><label>Tiêu đề<input name="title" required placeholder="Ví dụ: Trợ lý nội dung part-time" /></label><label>Danh mục<input name="category" placeholder="Marketing, Thiết kế..." /></label></div><label>Mô tả công việc<textarea name="description" required rows={3} /></label><div className="form-row"><label>Địa điểm<input name="location" /></label><label>Mức lương<input name="salaryRange" /></label></div><button className="button button-green" type="submit">Đăng tin <ArrowRight size={16} /></button></form>}
            <div className="section-line"><div><span className="eyebrow">BẢNG TIN</span><h2>{jobs.length} cơ hội đang hiển thị</h2></div><span className="sort-label">MỚI NHẤT <ChevronRight size={14} /></span></div>
            <div className="job-list">{jobs.length === 0 ? <div className="empty-state"><BriefcaseBusiness size={28} /><h3>Chưa có công việc phù hợp</h3><p>Thử đổi từ khóa hoặc bộ lọc để tìm cơ hội khác.</p></div> : jobs.map((job, index) => <article className="job-row" key={job.id}><span className="job-index">{String(index + 1).padStart(2, '0')}</span><div className="job-main"><div className="job-title-line"><h3>{job.title}</h3><span className={`status-tag ${job.status.toLowerCase()}`}>{statusLabels[job.status]}</span></div><p className="job-company">{job.employer?.employerProfile?.companyName || job.employer?.name || 'Nhà tuyển dụng'}</p><p className="job-description">{job.description}</p><div className="job-meta"><span><MapPin size={14} />{job.location || 'Linh hoạt'}</span>{job.category && <span>{job.category}</span>}{job.salaryRange && <span>{job.salaryRange}</span>}</div></div><div className="job-action">{profile.role === 'STUDENT' && job.status === 'OPEN' && <button className="text-action" onClick={() => setApplyingTo(job)}>Ứng tuyển <ArrowRight size={16} /></button>}{profile.role === 'EMPLOYER' && job.employer?.id === profile.id && <button className="text-action" onClick={() => openApplicants(job)}>Ứng viên <ArrowRight size={16} /></button>}</div></article>)}</div>
            {applicantsFor && <section className="detail-panel"><div className="composer-heading"><div><span className="eyebrow">HỒ SƠ ỨNG TUYỂN</span><h3>{applicantsFor.title}</h3></div><button className="icon-button" onClick={() => setApplicantsFor(null)} aria-label="Đóng"><X size={17} /></button></div>{applicants.length ? applicants.map(application => <div className="applicant-row" key={application.id}><div><b>{application.student?.name}</b><small>{application.student?.email} · {application.coverLetter}</small></div><span className={`status-tag ${application.status.toLowerCase()}`}>{statusLabels[application.status]}</span>{application.status === 'PENDING' && <div className="row-actions"><button className="small-button accept" onClick={() => changeApplicationStatus(application, 'ACCEPTED')}><Check size={14} /> Nhận</button><button className="small-button reject" onClick={() => changeApplicationStatus(application, 'REJECTED')}>Từ chối</button></div>}</div>) : <p className="muted-copy">Chưa có hồ sơ ứng tuyển.</p>}</section>}
          </>}

          {view === 'applications' && <><section className="page-heading"><div><span className="eyebrow">THEO DÕI TIẾN ĐỘ</span><h1>Đơn ứng tuyển</h1><p>Mỗi lần bắt đầu là một bước tiến mới.</p></div></section><div className="application-list">{applications.length ? applications.map(application => <article className="application-card" key={application.id}><div><span className="eyebrow">{application.job?.category || 'CÔNG VIỆC'}</span><h3>{application.job?.title}</h3><p>{application.job?.employer?.name || 'Nhà tuyển dụng'} · {application.job?.location || 'Linh hoạt'}</p></div><span className={`status-tag ${application.status.toLowerCase()}`}>{statusLabels[application.status]}</span></article>) : <div className="empty-state"><ClipboardList size={28} /><h3>Chưa có đơn ứng tuyển</h3><p>Những công việc bạn ứng tuyển sẽ xuất hiện tại đây.</p><button className="text-action" onClick={() => setView('jobs')}>Khám phá việc làm <ArrowRight size={16} /></button></div>}</div></>}

          {view === 'notifications' && <><section className="page-heading"><div><span className="eyebrow">CẬP NHẬT CỦA BẠN</span><h1>Thông báo</h1><p>Tin mới về công việc và hoạt động trên Ca Làm.</p></div></section><div className="notification-list">{notifications.length ? notifications.map(item => <article className={item.read ? 'notification-row read' : 'notification-row'} key={item.id}><span className="notification-dot"><Bell size={17} /></span><div><h3>{item.title}</h3><p>{item.content}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'Vừa cập nhật'}</small></div>{!item.read && <button className="small-button" onClick={() => markRead(item)}>Đánh dấu đã đọc</button>}</article>) : <div className="empty-state"><Bell size={28} /><h3>Chưa có thông báo</h3><p>Chúng tôi sẽ cập nhật khi có hoạt động mới.</p></div>}</div></>}

          {view === 'profile' && <><section className="page-heading"><div><span className="eyebrow">THÔNG TIN CÁ NHÂN</span><h1>Hồ sơ của tôi</h1><p>Giữ hồ sơ rõ ràng để kết nối hiệu quả hơn.</p></div></section><form className="profile-form" onSubmit={updateProfile}><div className="profile-banner"><span className="avatar avatar-large">{profile.name.slice(0, 1).toUpperCase()}</span><div><h2>{profile.name}</h2><p>{profile.email} · {profile.role === 'STUDENT' ? 'Sinh viên' : 'Nhà tuyển dụng'}</p></div></div><div className="form-row"><label>Họ và tên<input name="name" defaultValue={profile.name} /></label><label>Số điện thoại<input name="phone" defaultValue={profile.phone} /></label></div>{profile.role === 'STUDENT' ? <><label>Giới thiệu<textarea name="bio" rows={3} defaultValue={profile.bio} /></label><div className="form-row"><label>Địa chỉ<input name="address" defaultValue={profile.address} /></label><label>Kỹ năng<input name="skills" defaultValue={profile.skills} /></label></div><label>Liên kết CV<input name="cvUrl" defaultValue={profile.cvUrl} /></label></> : <><label>Tên công ty<input name="companyName" defaultValue={profile.companyName} /></label><label>Mô tả<textarea name="description" rows={3} defaultValue={profile.description} /></label><div className="form-row"><label>Website<input name="website" defaultValue={profile.website} /></label><label>Địa điểm<input name="location" defaultValue={profile.location} /></label></div></>}<button className="button button-dark" type="submit">Lưu hồ sơ <Check size={16} /></button></form></>}
        </div>
      </main>

      {applyingTo && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setApplyingTo(null) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="apply-title"><div className="composer-heading"><div><span className="eyebrow">ỨNG TUYỂN</span><h2 id="apply-title">{applyingTo.title}</h2></div><button className="icon-button" onClick={() => setApplyingTo(null)} aria-label="Đóng"><X size={17} /></button></div><form className="stack-form" onSubmit={submitApplication}><label>Liên kết CV<input name="cvUrl" defaultValue={profile.cvUrl || ''} placeholder="https://..." /></label><label>Lời nhắn<textarea name="coverLetter" required minLength={10} rows={5} placeholder="Giới thiệu ngắn gọn vì sao bạn phù hợp với công việc này." /></label><button className="button button-green button-wide" type="submit">Gửi đơn ứng tuyển <ArrowRight size={16} /></button></form></section></div>}
    </div>
  )
}