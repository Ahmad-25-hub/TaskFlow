import { useEffect, useState } from 'react'
import { ArrowUpRight, FolderKanban, KeyRound, LoaderCircle, Plus, Users } from 'lucide-react'
import Navbar from './Navbar'
import WorkspaceBoard from './WorkspaceBoard'
import WorkspaceStatistics from './WorkspaceStatistics'
import WorkspaceForm from './WorkspaceForm'
import { workspaceApi } from '../api/workspaces'

const routeId = () => new URLSearchParams(window.location.hash.slice(1)).get('workspace') || ''

export default function WorkspaceShell({ user, onLogout }) {
  const [workspaces, setWorkspaces] = useState([])
  const [view, setView] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('view'))
  const [activeId, setActiveId] = useState(routeId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [form, setForm] = useState(null)
  const active = workspaces.find((workspace) => workspace.id === activeId)

  useEffect(() => {
    const changed = () => {
      const id = routeId()
      setActiveId(id)
      setView(new URLSearchParams(window.location.hash.slice(1)).get('view'))
      if (id && !workspaces.some((workspace) => workspace.id === id)) {
        setLoading(true); setError(''); setAttempt((value) => value + 1)
      }
    }
    window.addEventListener('hashchange', changed)
    return () => window.removeEventListener('hashchange', changed)
  }, [workspaces])

  useEffect(() => {
    const controller = new AbortController()
    workspaceApi.list(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setWorkspaces(result) })
      .catch((issue) => { if (!controller.signal.aborted) setError(issue.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  function goHome() {
    window.location.assign('#')
    setView(null); setActiveId(''); setLoading(true); setError(''); setAttempt((value) => value + 1)
  }
  function open(workspace) { window.location.assign(`#workspace=${workspace.id}`); setActiveId(workspace.id); setView(null) }
  function updated(workspace) { setWorkspaces((current) => current.map((item) => item.id === workspace.id ? { ...item, ...workspace } : item)) }
  function created(workspace) {
    setWorkspaces((current) => [{ task_count: 0, ...workspace }, ...current.filter((item) => item.id !== workspace.id)])
    setForm(null); open(workspace)
  }

  return (
    <div className="app-page">
      <Navbar user={user} onHome={goHome} onLogout={onLogout} />
      {loading ? <div className="page-loading"><LoaderCircle size={22} className="animate-spin" />Memuat workspace...</div> : active ? (
        view === 'statistics' ? <WorkspaceStatistics key={active.id} workspace={active} onBack={() => open(active)} /> :
        <WorkspaceBoard key={active.id} workspace={active} onBack={goHome} onUpdated={updated} onStatistics={() => { window.location.assign(`#workspace=${active.id}&view=statistics`); setView('statistics') }} />
      ) : (
        <main className="overview-main">
          <div className="overview-header">
            <div><p className="eyebrow">WORKSPACE / {user.name}</p><h1 className="overview-heading">Ruang kerja kamu</h1><p className="mt-2 text-sm leading-6 text-slate-600">Pilih proyek untuk melihat tugas, atau buat ruang kerja untuk tim baru.</p></div>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setForm('join')} className="secondary-button"><KeyRound size={16} />Gabung workspace</button><button type="button" onClick={() => setForm('create')} className="primary-button"><Plus size={17} />Buat workspace</button></div>
          </div>
          {error && <div className="mb-6"><p role="alert" className="error-message">{error}</p><button type="button" onClick={goHome} className="secondary-button mt-3">Coba lagi</button></div>}
          <section className="overview-section"><div className="section-heading"><FolderKanban size={17} /><h2>Daftar workspace</h2><span className="count-pill">{workspaces.length}</span></div>
          {!error && workspaces.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><FolderKanban size={32} className="mx-auto mb-4 text-slate-400" /><h3 className="text-lg font-semibold">Belum ada workspace</h3><p className="mt-2 text-sm text-slate-500">Buat workspace baru atau gabung ke workspace tim dengan kode undangan.</p><button type="button" className="primary-button mt-6" onClick={() => setForm('create')}><Plus size={16} />Buat workspace pertama</button></div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <article key={workspace.id} aria-label={workspace.name} className="workspace-card">
                  <div className="mb-5 flex justify-between"><span className="workspace-icon"><FolderKanban size={20} /></span><span className="role-badge">{workspace.role === 'owner' ? 'Owner' : 'Member'}</span></div>
                  <h3 className="break-words text-[17px] font-bold">{workspace.name}</h3><p className="mt-2 min-h-12 break-words text-[13px] leading-5 text-slate-600">{workspace.description || 'Belum ada deskripsi workspace.'}</p>
                  <div className="mb-5 mt-5 flex items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><Users size={14} />{workspace.member_count} anggota</span><span>{workspace.task_count || 0} task</span></div>
                  <button type="button" onClick={() => open(workspace)} className="workspace-open">Buka workspace<ArrowUpRight size={16} /></button>
                </article>
              ))}
            </div>
          )}
          </section>
          <aside className="guide-panel" aria-label="Cara menggunakan TaskFlow"><div className="guide-step"><strong>1. Pilih workspace</strong>Setiap proyek punya papan dan anggota sendiri.</div><div className="guide-step"><strong>2. Tambahkan task</strong>Tulis pekerjaan yang perlu diselesaikan.</div><div className="guide-step"><strong>3. Pindahkan status</strong>Geser kartu dari To Do sampai Done.</div></aside>
        </main>
      )}
      {form && <WorkspaceForm mode={form} onClose={() => setForm(null)} onSuccess={created} />}
    </div>
  )
}
