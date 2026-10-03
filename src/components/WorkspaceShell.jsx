import { useEffect, useState } from 'react'
import { ArrowUpRight, FolderKanban, KeyRound, LoaderCircle, Plus, Users } from 'lucide-react'
import Navbar from './Navbar'
import WorkspaceBoard from './WorkspaceBoard'
import WorkspaceForm from './WorkspaceForm'
import { workspaceApi } from '../api/workspaces'

const routeId = () => new URLSearchParams(window.location.hash.slice(1)).get('workspace') || ''

export default function WorkspaceShell({ user, onLogout }) {
  const [workspaces, setWorkspaces] = useState([])
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
    setActiveId(''); setLoading(true); setError(''); setAttempt((value) => value + 1)
  }
  function open(workspace) { window.location.assign(`#workspace=${workspace.id}`); setActiveId(workspace.id) }
  function updated(workspace) { setWorkspaces((current) => current.map((item) => item.id === workspace.id ? { ...item, ...workspace } : item)) }
  function created(workspace) {
    setWorkspaces((current) => [{ task_count: 0, ...workspace }, ...current.filter((item) => item.id !== workspace.id)])
    setForm(null); open(workspace)
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-800">
      <Navbar user={user} onHome={goHome} onLogout={onLogout} />
      {loading ? <div className="page-loading"><LoaderCircle size={22} className="animate-spin" />Memuat workspace...</div> : active ? (
        <WorkspaceBoard key={active.id} workspace={active} onBack={goHome} onUpdated={updated} />
      ) : (
        <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-9 lg:py-14">
          <div className="mb-9 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div><p className="eyebrow mb-3">HALO, {user.name.toLocaleUpperCase('id')}</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Ruang kerja, ide besar<span className="text-indigo-500">.</span></h1><p className="mt-3 text-sm leading-7 text-slate-500">Pilih workspace untuk melanjutkan, atau mulai sesuatu yang baru.</p></div>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setForm('join')} className="secondary-button"><KeyRound size={16} />Gabung workspace</button><button type="button" onClick={() => setForm('create')} className="primary-button"><Plus size={17} />Buat workspace</button></div>
          </div>
          {error && <div className="mb-6"><p role="alert" className="error-message">{error}</p><button type="button" onClick={goHome} className="secondary-button mt-3">Coba lagi</button></div>}
          <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4"><FolderKanban size={18} className="text-indigo-500" /><h2 className="text-sm font-bold">Workspace kamu</h2><span className="rounded-md bg-slate-200/60 px-2 py-1 text-xs text-slate-500">{workspaces.length}</span></div>
          {!error && workspaces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center"><FolderKanban size={38} className="mx-auto mb-4 text-indigo-300" /><h3 className="text-lg font-semibold">Workspace pertamamu menunggu.</h3><p className="mt-2 text-sm text-slate-500">Buat ruang kerja sendiri atau gabung ke tim menggunakan kode undangan.</p><button type="button" className="primary-button mt-6" onClick={() => setForm('create')}><Plus size={16} />Buat workspace pertama</button></div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <article key={workspace.id} aria-label={workspace.name} className="workspace-card">
                  <div className="mb-5 flex justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500"><FolderKanban size={23} /></span><span className={`role-badge ${workspace.role === 'owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>{workspace.role === 'owner' ? 'Owner' : 'Member'}</span></div>
                  <h3 className="break-words text-lg font-bold">{workspace.name}</h3><p className="mt-2 min-h-12 break-words text-xs leading-6 text-slate-500">{workspace.description || 'Ruang untuk ide dan kolaborasi timmu.'}</p>
                  <div className="mb-5 mt-5 flex items-center gap-4 text-xs text-slate-400"><span className="flex items-center gap-1.5"><Users size={14} />{workspace.member_count} anggota</span><span>{workspace.task_count || 0} task</span></div>
                  <button type="button" onClick={() => open(workspace)} className="flex w-full items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-indigo-600">Buka workspace<ArrowUpRight size={16} /></button>
                </article>
              ))}
            </div>
          )}
          <p className="mt-8 text-center text-xs text-slate-400">Ruang berbeda untuk setiap project. Fokus yang sama untuk menyelesaikannya.</p>
        </main>
      )}
      {form && <WorkspaceForm mode={form} onClose={() => setForm(null)} onSuccess={created} />}
    </div>
  )
}
