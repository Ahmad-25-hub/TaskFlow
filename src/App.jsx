import { useEffect, useState } from 'react'
import { ArrowUpRight, CheckCheck, LayoutGrid, Plus, Search, X } from 'lucide-react'
import Navbar from './components/Navbar'
import KanbanBoard from './components/KanbanBoard'
import AddTaskModal from './components/AddTaskModal'
import { TASK_STATUSES } from './data/tasks'
import { taskApi } from './api/tasks'

export default function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalStatus, setModalStatus] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const completed = tasks.filter((task) => task.status === 'done').length
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0
  const filteredTasks = tasks.filter((task) => {
    const matchesQuery = `${task.title} ${task.description}`.toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id'))
    return matchesQuery && (statusFilter === 'all' || task.status === statusFilter)
  })

  useEffect(() => {
    taskApi.list().then(setTasks).catch((issue) => setError(issue.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timeout)
  }, [notice])

  async function addTask(values) {
    try {
      const task = await taskApi.create(values)
      setTasks((current) => [task, ...current])
      setQuery('')
      setStatusFilter('all')
      setModalStatus(null)
      setError('')
      setNotice(`Task “${task.title}” berhasil ditambahkan.`)
    } catch (issue) { setError(issue.message) }
  }

  async function deleteTask(id) {
    try {
      await taskApi.remove(id)
      setTasks((current) => current.filter((task) => task.id !== id))
      setError('')
      setNotice('Task berhasil dihapus.')
    } catch (issue) { setError(issue.message) }
  }

  async function moveTask(id, status) {
    if (!TASK_STATUSES.some((item) => item.id === status)) return
    try {
      await taskApi.move(id, status)
      setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task))
      setError('')
      setNotice(`Task dipindahkan ke ${TASK_STATUSES.find((item) => item.id === status).label}.`)
    } catch (issue) { setError(issue.message) }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-[1480px] px-5 py-8 sm:px-9 lg:px-12 lg:py-11">
        <div className="mb-7 flex items-center gap-2 text-xs text-slate-400">
          <LayoutGrid size={14} /><span>Workspace</span><span className="mx-1">/</span><span className="font-medium text-slate-600">Project hackathon</span>
        </div>
        <section className="mb-9 flex flex-col justify-between gap-7 lg:flex-row lg:items-center" aria-labelledby="board-title">
          <div>
            <p className="eyebrow mb-3">SEDIKIT DEMI SEDIKIT, JADI NYATA</p>
            <h1 id="board-title" className="text-3xl font-bold tracking-tight sm:text-[40px] sm:leading-tight">Ide besar. Langkah kecil<span className="text-indigo-500">.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">Satu tempat untuk merapikan ide, menjaga fokus, dan menyelesaikan<br className="hidden xl:block" /> hal yang berarti. Mari buat progress hari ini.</p>
          </div>
          <div className="progress-panel w-full rounded-2xl border border-white bg-white/80 p-5 sm:w-72">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CheckCheck size={16} className="text-indigo-500" /> Progress project</span>
              <ArrowUpRight size={15} className="text-slate-400" />
            </div>
            <div className="mb-3 mt-4 flex items-end justify-between">
              <strong className="text-3xl tracking-tight">{progress}<span className="ml-0.5 text-lg text-slate-400">%</span></strong>
              <span className="pb-1 text-xs text-slate-500">{completed} dari {tasks.length} selesai</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Progress project" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>

        <section aria-label="Papan task">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-100/70 text-indigo-600"><LayoutGrid size={18} /></span>
              <h2 className="text-base font-bold">Project board</h2>
              <span className="rounded-md bg-slate-200/60 px-2 py-1 text-xs font-medium text-slate-500">{tasks.length} task</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
                <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <input aria-label="Cari task" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari task..." className="field w-full py-2.5 pl-9 pr-8 text-xs" />
                {query && <button type="button" aria-label="Bersihkan pencarian" onClick={() => setQuery('')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-700"><X size={16} /></button>}
              </label>
              <button type="button" className="primary-button" onClick={() => setModalStatus('todo')}><Plus size={17} />Tambah task</button>
            </div>
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500"><span className="size-1.5 rounded-full bg-emerald-500" /><span>Ruang kerja tim kreatifmu</span></div>
            <label className="flex items-center gap-2 text-xs text-slate-500">Tampilkan
              <select aria-label="Filter status" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Semua status</option>
                {TASK_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
            </label>
          </div>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {loading ? <p className="py-8 text-center text-sm text-slate-500">Memuat task...</p> : <KanbanBoard tasks={filteredTasks} allTasks={tasks} onAddTask={setModalStatus} onDeleteTask={deleteTask} onMoveTask={moveTask} isFiltered={Boolean(query.trim()) || statusFilter !== 'all'} />}
        </section>
        <footer className="mt-7 flex flex-col items-center justify-between gap-2 text-[11px] text-slate-400 sm:flex-row">
          <p>Drag kartu antar kolom, atau gunakan pilihan status di kartu.</p>
          <p>Data tersimpan di database TaskFlow</p>
        </footer>
      </main>
      <div aria-live="polite" role="status" className={notice ? 'toast' : 'sr-only'}>{notice && <CheckCheck size={18} className="shrink-0 text-emerald-500" />}{notice}</div>
      {modalStatus && <AddTaskModal defaultStatus={modalStatus} onClose={() => { setModalStatus(null); setError('') }} onSubmit={addTask} serverError={error} />}
    </div>
  )
}
