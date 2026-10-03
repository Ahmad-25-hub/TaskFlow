import { CalendarDays, ChevronDown, GripVertical, Trash2 } from 'lucide-react'
import { TASK_STATUSES } from '../data/tasks'

const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })

export default function TaskCard({ columns = TASK_STATUSES, task, onDelete, onMove, onDragChange, isDragging, isBusy }) {
  const status = columns.find((item) => item.id === task.status)

  function handleDragStart(event) {
    if (event.target.closest('button, select')) { event.preventDefault(); return }
    event.dataTransfer.setData('text/plain', task.id)
    event.dataTransfer.effectAllowed = 'move'
    onDragChange(task.id)
  }

  return (
    <article aria-label={task.title} aria-busy={isBusy} className={`task-card ${isDragging ? 'is-dragging' : ''}`} draggable={!isBusy} onDragStart={handleDragStart} onDragEnd={() => onDragChange(null)}>
      <div className="mb-3 flex items-center justify-between">
        <span className={`task-tag tag-${status.color}`}><span className="size-1 rounded-full bg-current" />{status.label}</span>
        <div className="flex items-center gap-1">
          <GripVertical size={14} className="text-slate-300" aria-hidden="true" />
          <button type="button" disabled={isBusy} aria-label={`Hapus task ${task.title}`} className="delete-button" onClick={() => onDelete(task.id)}><Trash2 size={14} /></button>
        </div>
      </div>
      <h4 className="break-words text-[13px] font-bold leading-6 text-slate-700">{task.title}</h4>
      <p className="task-description mt-1.5 break-words text-xs leading-[1.8] text-slate-500">{task.description || 'Belum ada deskripsi untuk task ini.'}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <time dateTime={task.created_at} className="flex items-center gap-1.5 text-[10px] text-slate-400"><CalendarDays size={12} />{dateFormatter.format(new Date(task.created_at))}</time>
        <div className="relative">
          <select disabled={isBusy} aria-label={`Status task ${task.title}`} value={task.status} onChange={(event) => onMove(task.id, event.target.value)} className="task-status-select">
            {columns.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <ChevronDown size={11} className="pointer-events-none absolute right-1 top-2 text-slate-400" />
        </div>
      </div>
    </article>
  )
}
