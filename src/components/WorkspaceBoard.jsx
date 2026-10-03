import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCheck, LayoutGrid, Plus, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import KanbanBoard from './KanbanBoard'
import AddTaskModal from './AddTaskModal'
import WorkspaceSettings from './WorkspaceSettings'
import AddColumnModal from './AddColumnModal'
import { columnApi } from '../api/columns'
import { taskApi } from '../api/tasks'

export default function WorkspaceBoard({ workspace, onBack, onUpdated }) {
  const [now, setNow] = useState(() => new Date())
  const [showSettings, setShowSettings] = useState(false)
  const [tasks, setTasks] = useState([])
  const [columns, setColumns] = useState([])
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [isSavingColumnOrder, setIsSavingColumnOrder] = useState(false)
  const savingOrderRef = useRef(false)
  const deletingColumnRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [modalStatus, setModalStatus] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [pendingIds, setPendingIds] = useState(new Set())
  const pendingRef = useRef(new Set())
  const completed = tasks.filter((task) => task.status === 'done').length
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0
  const filteredTasks = tasks.filter((task) => {
    const matchesQuery = `${task.title} ${task.description}`.toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id'))
    return matchesQuery && (statusFilter === 'all' || task.status === statusFilter)
  })

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([taskApi.list(workspace.id, controller.signal), columnApi.list(workspace.id, controller.signal)])
      .then(([data, statuses]) => { if (!controller.signal.aborted) { setTasks(data); setColumns(statuses) } })
      .catch((issue) => { if (!controller.signal.aborted) setError(issue.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [workspace.id])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timeout)
  }, [notice])

  async function addColumn(values) {
    if (savingOrderRef.current) return
    try {
      const column = await columnApi.create(workspace.id, values)
      setColumns((current) => [...current, column])
      setShowAddColumn(false)
      setError('')
      setNotice(`Kolom ${column.label} berhasil ditambahkan.`)
    } catch (issue) { setError(issue.message) }
  }

  async function deleteColumn(id, label) {
    if (savingOrderRef.current || deletingColumnRef.current || pendingRef.current.size || !window.confirm(`Hapus kolom “${label}”? Task di dalamnya akan dipindahkan ke To Do.`)) return
    deletingColumnRef.current = true
    const affected = tasks.filter((task) => task.status === id).map((task) => task.id)
    affected.forEach((taskId) => pendingRef.current.add(taskId))
    setPendingIds(new Set(pendingRef.current))
    try {
      await columnApi.remove(workspace.id, id)
      const [latestTasks, latestColumns] = await Promise.all([taskApi.list(workspace.id), columnApi.list(workspace.id)])
      setTasks(latestTasks)
      setColumns(latestColumns)
      setStatusFilter('all')
      setError('')
      setNotice(`Kolom ${label} dihapus. Task dipindahkan ke To Do.`)
    } catch (issue) { setError(issue.message) }
    finally {
      deletingColumnRef.current = false
      affected.forEach((taskId) => pendingRef.current.delete(taskId))
      setPendingIds(new Set(pendingRef.current))
    }
  }

  async function moveColumn(id, targetId, placement = 'before') {
    if (savingOrderRef.current || deletingColumnRef.current) return
    const moved = columns.find((column) => column.id === id)
    if (!moved || id === targetId) return
    const reordered = columns.filter((column) => column.id !== id)
    const target = reordered.findIndex((column) => column.id === targetId)
    if (target < 0) return
    const targetIndex = target + (placement === 'after' ? 1 : 0)
    reordered.splice(targetIndex, 0, moved)
    if (reordered.every((column, index) => column.id === columns[index].id)) return
    savingOrderRef.current = true
    setIsSavingColumnOrder(true)
    try {
      const saved = await columnApi.reorder(workspace.id, reordered)
      setColumns(saved)
      setError('')
      setNotice(`Urutan kolom “${moved.label}” berhasil diubah.`)
    } catch (issue) {
      setError(issue.message)
    } finally {
      savingOrderRef.current = false
      setIsSavingColumnOrder(false)
    }
  }

  async function addTask(values) {
    try {
      const task = await taskApi.create(workspace.id, values)
      setTasks((current) => [task, ...current])
      setQuery('')
      setStatusFilter('all')
      setModalStatus(null)
      setError('')
      setNotice(`Task “${task.title}” berhasil ditambahkan.`)
    } catch (issue) { setError(issue.message) }
  }

  function openEditTask(task) {
    if (deletingColumnRef.current || pendingRef.current.has(task.id)) return
    setError('')
    setEditingTask(task)
  }

  async function editTask(values) {
    const id = editingTask.id
    if (deletingColumnRef.current || pendingRef.current.has(id)) return
    pendingRef.current.add(id); setPendingIds(new Set(pendingRef.current))
    try {
      const updated = await taskApi.update(workspace.id, id, values)
      setTasks((current) => current.map((task) => task.id === id ? updated : task))
      setEditingTask(null)
      setQuery('')
      setStatusFilter('all')
      setError('')
      setNotice(`Task ${updated.title} berhasil diperbarui.`)
    } catch (issue) { setError(issue.message) }
    finally { pendingRef.current.delete(id); setPendingIds(new Set(pendingRef.current)) }
  }

  async function deleteTask(id) {
    if (deletingColumnRef.current || pendingRef.current.has(id)) return
    pendingRef.current.add(id); setPendingIds(new Set(pendingRef.current))
    try {
      await taskApi.remove(workspace.id, id)
      setTasks((current) => current.filter((task) => task.id !== id))
      setError('')
      setNotice('Task berhasil dihapus.')
    } catch (issue) { setError(issue.message) }
    finally { pendingRef.current.delete(id); setPendingIds(new Set(pendingRef.current)) }
  }

  async function updateDeadline(id, deadline) {
    if (deletingColumnRef.current || pendingRef.current.has(id)) return false
    pendingRef.current.add(id); setPendingIds(new Set(pendingRef.current))
    try {
      const updated = await taskApi.deadline(workspace.id, id, deadline)
      setTasks((current) => current.map((task) => task.id === id ? updated : task))
      setError('')
      setNotice(deadline ? 'Deadline berhasil diperbarui.' : 'Deadline berhasil dihapus.')
      return true
    } catch (issue) { setError(issue.message); return false }
    finally { pendingRef.current.delete(id); setPendingIds(new Set(pendingRef.current)) }
  }

  async function moveTask(id, status) {
    if (deletingColumnRef.current || pendingRef.current.has(id) || !columns.some((item) => item.id === status)) return
    pendingRef.current.add(id); setPendingIds(new Set(pendingRef.current))
    try {
      const updated = await taskApi.move(workspace.id, id, status)
      setTasks((current) => current.map((task) => task.id === id ? updated : task))
      setError('')
      setNotice(`Task dipindahkan ke ${columns.find((item) => item.id === status).label}.`)
    } catch (issue) { setError(issue.message) }
    finally { pendingRef.current.delete(id); setPendingIds(new Set(pendingRef.current)) }
  }

  return (
    <div className="app-page">
      <main className="board-main">
        <div className="board-crumb flex items-center gap-2">
          <button type="button" onClick={onBack} className="flex items-center gap-2 hover:text-blue-700"><ArrowLeft size={14} />Semua workspace</button><span>/</span><span className="font-medium text-slate-700">{workspace.name}</span>
        </div>
        <section className="board-heading" aria-labelledby="board-title">
          <div className="min-w-0">
            <p className="eyebrow">PAPAN KERJA · {workspace.role === 'owner' ? 'OWNER' : 'MEMBER'}</p>
            <h1 id="board-title" className="board-title">{workspace.name}.</h1>
            <p className="mt-2 max-w-xl break-words text-sm leading-6 text-slate-600">{workspace.description || 'Semua pekerjaan proyek ini ada di satu papan.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="progress-panel"><div className="flex items-center justify-between gap-5"><span className="text-xs font-semibold text-slate-600">Progress</span><strong className="text-sm">{progress}%</strong></div><div className="my-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Progress project" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div><p className="text-[11px] text-slate-500">{completed} dari {tasks.length} task selesai</p></div>
            <button type="button" onClick={() => setShowSettings(true)} className="secondary-button"><Users size={15} />Anggota & pengaturan</button>
          </div>
        </section>

        <section aria-label="Papan task">
          <div className="board-toolbar">
            <div className="flex items-center gap-2.5">
              <LayoutGrid size={18} className="text-slate-600" />
              <h2 className="text-base font-bold">Papan tugas</h2>
              <span className="count-pill">{tasks.length}</span>
            </div>
            <div className="board-toolbar-actions">
              <label className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
                <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
                <input aria-label="Cari task" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari task" className="field w-full py-2.5 pl-9 pr-8 text-xs" />
                {query && <button type="button" aria-label="Bersihkan pencarian" onClick={() => setQuery('')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-700"><X size={16} /></button>}
              </label>
              <label className="relative"><SlidersHorizontal size={14} className="pointer-events-none absolute left-3 top-3 text-slate-500" /><select aria-label="Filter status" className="field min-h-10 pl-8 pr-3 text-xs font-medium" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Semua status</option>{columns.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
              <button type="button" disabled={loading} className="primary-button" onClick={() => setModalStatus('todo')}><Plus size={17} />Tambah task</button>
            </div>
          </div>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {loading ? <p className="py-8 text-center text-sm text-slate-500">Memuat task...</p> : <KanbanBoard now={now} onMoveColumn={moveColumn} isSavingColumnOrder={isSavingColumnOrder} columns={columns} onOpenAddColumn={() => { setError(''); setShowAddColumn(true) }} onDeleteColumn={deleteColumn} tasks={filteredTasks} allTasks={tasks} pendingIds={pendingIds} onAddTask={setModalStatus} onDeleteTask={deleteTask} onEditTask={openEditTask} onMoveTask={moveTask} onUpdateDeadline={updateDeadline} isFiltered={Boolean(query.trim()) || statusFilter !== 'all'} />}
        </section>
        <footer className="mt-4 text-xs text-slate-500">
          <p>Seret kartu untuk mengubah status. Seret judul kolom untuk mengatur urutan.</p>
        </footer>
      </main>
      <div aria-live="polite" role="status" className={notice ? 'toast' : 'sr-only'}>{notice && <CheckCheck size={18} className="shrink-0 text-emerald-500" />}{notice}</div>
      {modalStatus && <AddTaskModal columns={columns} defaultStatus={modalStatus} onClose={() => { setModalStatus(null); setError('') }} onSubmit={addTask} serverError={error} />}
      {editingTask && <AddTaskModal key={editingTask.id} initialTask={editingTask} columns={columns} onClose={() => { setEditingTask(null); setError('') }} onSubmit={editTask} serverError={error} />}
      {showAddColumn && <AddColumnModal onClose={() => { setShowAddColumn(false); setError('') }} onSubmit={addColumn} serverError={error} />}
      {showSettings && <WorkspaceSettings workspace={workspace} onClose={() => setShowSettings(false)} onUpdated={onUpdated} />}
    </div>
  )
}
