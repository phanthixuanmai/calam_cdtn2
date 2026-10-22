import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BriefcaseBusiness,
  Check, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Search, ShieldCheck,
  SlidersHorizontal, Users, X,
} from 'lucide-react'
import { api, type Job, type Role, type Stats, type User } from './api'

type View = 'overview' | 'users' | 'jobs'
type AuthData = { token: string; role: Role; email: string; name: string }

const roles: Record<Role, string> = { STUDENT: 'Sinh viên', EMPLOYER: 'Nhà tuyển dụng', ADMIN: 'Quản trị viên' }

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('fm.admin.token'))
  const [adminName, setAdminName] = useState(localStorage.getItem('fm.admin.name') || 'Quản trị viên')
  const [view, setView] = useState<View>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadDashboard() {
    const [dashboard, userResult, jobResult] = await Promise.all([
      api<Stats>('/admin/dashboard'), api<User[]>('/admin/users'), api<Job[]>('/admin/jobs'),
    ])
    setStats(dashboard.data)
    setUsers(userResult.data)
    setJobs(jobResult.data)
  }

  useEffect(() => {
    if (!token) return
    loadDashboard().catch(caught => {
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu quản trị')
      localStorage.removeItem('fm.admin.token')
      setToken(null)
    })
  }, [token])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: String(form.get('identity')), password: String(form.get('password')) }),
      })
      const result = await response.json() as { success: boolean; message: string; data: AuthData }
      if (!response.ok || !result.success) throw new Error(result.message || 'Thông tin đăng nhập không hợp lệ')
      if (result.data.role !== 'ADMIN') throw new Error('Tài khoản này không có quyền quản trị')
      localStorage.setItem('fm.admin.token', result.data.token)
      localStorage.setItem('fm.admin.name', result.data.name)
      setAdminName(result.data.name)
      setToken(result.data.token)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đăng nhập')
    } finally {
      setBusy(false)
    }
  }

  async function toggleUser(user: User) {
    setError('')
    try {
      const result = await api<User>(`/admin/users/${user.id}/status`, { method: 'PUT' })
      setUsers(items => items.map(item => item.id === user.id ? result.data : item))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật trạng thái')
    }
  }

  async function refresh() {
    try {
      await loadDashboard()
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu')
    }
  }

  function signOut() {
    localStorage.removeItem('fm.admin.token')
    localStorage.removeItem('fm.admin.name')
    setToken(null)
    setStats(null)
    setUsers([])
    setJobs([])
  }

  const filteredUsers = useMemo(() => users.filter(user => {
    const matchesQuery = `${user.name} ${user.email} ${user.username}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (roleFilter === 'ALL' || user.role === roleFilter)
  }), [users, query, roleFilter])

  const filteredJobs = useMemo(() => jobs.filter(job => `${job.title} ${job.employer?.name || ''} ${job.location || ''}`.toLowerCase().includes(query.toLowerCase())), [jobs, query])

  if (!token) return <main className="login-shell"><section className="login-aside"><a className="admin-brand" href="#admin"><span className="brand-square">c</span><span>CA LÀM <small>CONTROL ROOM</small></span></a><div className="login-manifesto"><span className="eyebrow"><ShieldCheck size={14} /> QUẢN TRỊ HỆ THỐNG</span><h1>Vận hành<br /><em>có chủ đích.</em></h1><p>Một góc nhìn rõ ràng về cộng đồng, công việc và sức khỏe của marketplace.</p></div><span className="aside-bottom">INTERNAL OPERATIONS / 2026</span></section><section className="login-main"><div className="login-meta"><span>CA LÀM / ADMIN</span><span>SECURE ACCESS</span></div><form className="login-form" onSubmit={signIn}><span className="eyebrow">KHU VỰC QUẢN TRỊ</span><h2>Đăng nhập hệ thống</h2><p>Chỉ tài khoản ADMIN mới có quyền truy cập.</p><label>Email hoặc tên người dùng<input name="identity" autoComplete="username" required placeholder="admin@..." /></label><label>Mật khẩu<input name="password" autoComplete="current-password" type="password" required placeholder="Mật khẩu quản trị" /></label>{error && <div className="error-banner" role="alert">{error}</div>}<button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang xác thực...' : 'Vào trang quản trị'}<ArrowRight size={16} /></button><span className="security-note"><ShieldCheck size={15} /> Phân quyền được xác thực tại máy chủ.</span></form><div className="login-footer"><span>© CA LÀM</span><span>ACCESS LOGGED</span></div></section></main>

  const nav = [
    { id: 'overview' as View, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'users' as View, label: 'Người dùng', icon: Users, count: users.length },
    { id: 'jobs' as View, label: 'Việc làm', icon: BriefcaseBusiness, count: jobs.length },
  ]

  const statRows = [
    { label: 'Sinh viên', value: stats?.totalStudents ?? 0, icon: Users, color: 'mint', detail: 'CỘNG ĐỒNG' },
    { label: 'Nhà tuyển dụng', value: stats?.totalEmployers ?? 0, icon: ShieldCheck, color: 'amber', detail: 'ĐỐI TÁC' },
    { label: 'Tin tuyển dụng', value: stats?.totalJobs ?? 0, icon: BriefcaseBusiness, color: 'blue', detail: 'MARKETPLACE' },
    { label: 'Đơn ứng tuyển', value: stats?.totalApplications ?? 0, icon: Activity, color: 'coral', detail: 'TƯƠNG TÁC' },
  ]

  return <div className="admin-shell">
    <aside className="admin-sidebar"><a className="admin-brand" href="#admin"><span className="brand-square">c</span><span>CA LÀM <small>CONTROL ROOM</small></span></a><div className="nav-caption">WORKSPACE</div><nav className="admin-nav">{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => { setView(item.id); setQuery('') }}><Icon size={17} /><span>{item.label}</span>{item.count !== undefined && <b>{item.count}</b>}</button> })}</nav><div className="sidebar-footer"><div className="admin-profile"><span className="admin-avatar">{adminName.slice(0, 1).toUpperCase()}</span><span><b>{adminName}</b><small>ADMINISTRATOR</small></span><button onClick={signOut} title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={15} /></button></div><div className="system-status"><i /> API đang hoạt động <span>v1.0</span></div></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div className="breadcrumbs"><span>CA LÀM</span><span>/</span><b>{view === 'overview' ? 'TỔNG QUAN' : view === 'users' ? 'NGƯỜI DÙNG' : 'VIỆC LÀM'}</b></div><div className="topbar-actions"><span className="last-sync"><i /> LIVE DATA</span><button className="help-button" title="Làm mới dữ liệu" onClick={refresh}><Activity size={16} /></button><button className="avatar-small" title="Đăng xuất" aria-label="Đăng xuất" onClick={signOut}>{adminName.slice(0, 1).toUpperCase()}</button></div></header>
      <div className="admin-content">{error && <div className="error-banner page-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Đóng"><X size={15} /></button></div>}
        {view === 'overview' && <><section className="overview-heading"><div><span className="eyebrow">THỨ NĂM / 01.10.2026</span><h1>Tổng quan <em>hoạt động.</em></h1><p>Dữ liệu vận hành của Ca Làm, cập nhật trực tiếp từ hệ thống.</p></div><button className="outline-button" onClick={refresh}><Activity size={15} /> Làm mới dữ liệu</button></section><section className="metric-grid">{statRows.map((stat, index) => { const Icon = stat.icon; return <article className={`metric metric-${stat.color}`} key={stat.label} style={{ animationDelay: `${index * 55}ms` }}><div className="metric-top"><span>{stat.detail}</span><Icon size={17} /></div><strong>{stat.value.toLocaleString('vi-VN')}</strong><div className="metric-bottom"><span>{stat.label}</span><span className="metric-trend"><ArrowUpRight size={13} /> LIVE</span></div></article> })}</section><section className="overview-lower"><div className="activity-section"><div className="section-head"><div><span className="eyebrow">HỆ SINH THÁI</span><h2>Marketplace snapshot</h2></div><button className="link-button" onClick={() => setView('users')}>Quản lý người dùng <ArrowRight size={14} /></button></div><div className="ratio-row"><div><span>Hoàn tất công việc</span><b>{stats?.totalCompletedJobs ?? 0}</b></div><div className="ratio-bar"><span style={{ width: `${Math.min(100, stats?.totalJobs ? (stats.totalCompletedJobs / stats.totalJobs) * 100 : 0)}%` }} /></div><small>SO VỚI {stats?.totalJobs ?? 0} TIN ĐĂNG</small></div><div className="role-breakdown">{(['STUDENT', 'EMPLOYER', 'ADMIN'] as Role[]).map(role => { const count = users.filter(user => user.role === role).length; const percent = users.length ? Math.round(count / users.length * 100) : 0; return <div className="role-row" key={role}><span className={`role-dot ${role.toLowerCase()}`} /><span>{roles[role]}</span><div className="mini-track"><i style={{ width: `${percent}%` }} /></div><b>{count}</b></div> })}</div></div><div className="recent-section"><div className="section-head"><div><span className="eyebrow">MỚI NHẤT</span><h2>Tin tuyển dụng</h2></div><button className="icon-link" onClick={() => setView('jobs')} title="Xem tất cả"><ArrowRight size={16} /></button></div>{jobs.slice(0, 4).length ? jobs.slice(0, 4).map(job => <div className="recent-job" key={job.id}><span className="recent-job-icon"><BriefcaseBusiness size={16} /></span><div><b>{job.title}</b><small>{job.employer?.name || 'Nhà tuyển dụng'} · {job.location || 'Linh hoạt'}</small></div><span className={`job-state ${job.status.toLowerCase()}`}>{job.status}</span></div>) : <p className="empty-copy">Chưa có tin tuyển dụng.</p>}</div></section><section className="system-ribbon"><div><span className="ribbon-icon"><Check size={17} /></span><span><b>Quyền kiểm soát nằm ở server</b><small>Thao tác quản trị được xác thực bằng JWT và role ADMIN.</small></span></div><span className="ribbon-code">AUTH / VERIFIED <ArrowDownRight size={14} /></span></section></>}

        {view === 'users' && <><section className="overview-heading page-title"><div><span className="eyebrow">CỘNG ĐỒNG / {users.length} TÀI KHOẢN</span><h1>Người dùng <em>hệ thống.</em></h1><p>Tra cứu tài khoản và quản lý trạng thái truy cập.</p></div></section><div className="table-toolbar"><label className="table-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên, email hoặc username" /></label><label className="select-filter"><SlidersHorizontal size={15} /><select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="ALL">Tất cả vai trò</option><option value="STUDENT">Sinh viên</option><option value="EMPLOYER">Nhà tuyển dụng</option><option value="ADMIN">Quản trị viên</option></select><ChevronDown size={14} /></label><button className="outline-button refresh-users" onClick={refresh}><Activity size={15} /> Làm mới</button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>TÀI KHOẢN</th><th>VAI TRÒ</th><th>LIÊN HỆ</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>{filteredUsers.map(user => <tr key={user.id}><td><div className="user-cell"><span className={`table-avatar ${user.role.toLowerCase()}`}>{user.name.slice(0, 1).toUpperCase()}</span><span><b>{user.name}</b><small>@{user.username || user.email}</small></span></div></td><td><span className={`role-pill ${user.role.toLowerCase()}`}>{roles[user.role]}</span></td><td><span className="contact-cell">{user.email}<small>{user.phone || 'Chưa cập nhật số điện thoại'}</small></span></td><td><span className={user.enabled ? 'account-status enabled' : 'account-status disabled'}><i />{user.enabled ? 'Đang hoạt động' : 'Đã khóa'}</span></td><td><button className={user.enabled ? 'status-action disable' : 'status-action enable'} onClick={() => toggleUser(user)} disabled={user.role === 'ADMIN'}>{user.role === 'ADMIN' ? 'BẢO VỆ' : user.enabled ? 'KHÓA' : 'MỞ KHÓA'}</button></td></tr>)}</tbody></table>{filteredUsers.length === 0 && <div className="table-empty">Không tìm thấy tài khoản phù hợp.</div>}</div></>}

        {view === 'jobs' && <><section className="overview-heading page-title"><div><span className="eyebrow">MARKETPLACE / {jobs.length} TIN ĐĂNG</span><h1>Việc làm <em>toàn hệ thống.</em></h1><p>Theo dõi các tin đăng và nhà tuyển dụng trên marketplace.</p></div></section><div className="table-toolbar"><label className="table-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo vị trí, nhà tuyển dụng hoặc địa điểm" /></label><button className="outline-button refresh-users" onClick={refresh}><Activity size={15} /> Làm mới</button></div><div className="data-table-wrap"><table className="data-table jobs-table"><thead><tr><th>VỊ TRÍ</th><th>NHÀ TUYỂN DỤNG</th><th>ĐỊA ĐIỂM</th><th>TRẠNG THÁI</th></tr></thead><tbody>{filteredJobs.map(job => <tr key={job.id}><td><div className="job-cell"><span className="table-job-icon"><BriefcaseBusiness size={16} /></span><span><b>{job.title}</b><small>{job.category || 'Chưa phân loại'} · ID {job.id.slice(-6)}</small></span></div></td><td><span className="contact-cell">{job.employer?.name || 'Nhà tuyển dụng'}<small>{job.employer?.email || ' '}</small></span></td><td>{job.location || 'Linh hoạt'}</td><td><span className={`job-state ${job.status.toLowerCase()}`}>{job.status}</span></td></tr>)}</tbody></table>{filteredJobs.length === 0 && <div className="table-empty">Không tìm thấy tin đăng.</div>}</div></>}
      </div><footer className="admin-footer"><span>CA LÀM CONTROL ROOM</span><span><CircleHelp size={13} /> INTERNAL OPERATIONS</span><span>API / LOCALHOST:8080</span></footer>
    </main>
  </div>
}