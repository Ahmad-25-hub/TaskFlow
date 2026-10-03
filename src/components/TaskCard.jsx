import { useState } from 'react'
import { deadlineInfo } from '../utils/deadline'
import { CalendarDays, ChevronDown, GripVertical, Pencil, Trash2, UserRound, CircleCheck } from 'lucide-react'
import { TASK_STATUSES } from '../data/tasks'

const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })

export default function TaskCard({ columns = TASK_STATUSES, task, onEdit, onDelete, onMove, onDragChange, isDragging, isBusy, now, onUpdateDeadline }) {
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [draftDeadline, setDraftDeadline] = useState(task.deadline || '')
  const deadline = deadlineInfo(task.deadline, task.status, now)
  const status = columns.find((item) => item.id === task.status)

  function handleDragStart(event) {
    if (event.target.closest('button, select, input, form')) { event.preventDefault(); return }
    event.dataTransfer.setData('text/plain', task.id)
    event.dataTransfer.effectAllowed = 'move'
    onDragChange(task.id)
  }

  return (
    <article aria-label={task.title} aria-busy={isBusy} className={`task-card ${isDragging ? 'is-dragging' : ''}`} draggable={!isBusy && !editingDeadline} onDragStart={handleDragStart} onDragEnd={() => onDragChange(null)}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`task-card-accent tag-${status.color}`} aria-hidden="true" />
        <div className="flex items-center gap-1">
          <GripVertical size={14} className="text-slate-300" aria-hidden="true" />
          <button type="button" disabled={isBusy} aria-label={`Edit task ${task.title}`} title="Edit task" className="delete-button hover:text-indigo-600" onClick={() => { setEditingDeadline(false); onEdit(task) }}><Pencil size={14} /></button>
          <button type="button" disabled={isBusy} aria-label={`Hapus task ${task.title}`} className="delete-button" onClick={() => onDelete(task.id)}><Trash2 size={14} /></button>
        </div>
      </div>
      <h4 className="break-words text-[13px] font-semibold leading-5 text-slate-800">{task.title}</h4>
      {task.description && <p className="task-description mt-1.5 break-words text-xs leading-[1.6] text-slate-500">{task.description}</p>}
      <div className="mt-3">
        {editingDeadline ? (
          <form className="rounded-md border border-slate-200 bg-slate-50 p-3" onSubmit={async (event) => {
            event.preventDefault()
            if (await onUpdateDeadline(task.id, draftDeadline || null)) setEditingDeadline(false)
          }}>
            <label htmlFor={`deadline-${task.id}`} className="block text-xs font-semibold text-slate-600">Deadline {task.title}</label>
            <input autoFocus type="date" id={`deadline-${task.id}`} min="1000-01-01" max="9999-12-31" disabled={isBusy} value={draftDeadline} onChange={(event) => setDraftDeadline(event.target.value)} className="field mt-2 w-full min-w-0 px-2 py-2 text-xs" />
            <div className="mt-3 space-y-1.5 text-[11px] leading-5 text-slate-500">
        <p className="flex items-start gap-1.5"><UserRound size={12} className="mt-1 shrink-0" /><span className="min-w-0 break-words">Dibuat oleh: <span className="font-medium text-slate-700">{task.creator_name || 'Belum tercatat'}</span></span></p>
        {task.status === 'done' && (
          <div className="flex items-start gap-1.5 text-emerald-700"><CircleCheck size={12} className="mt-1 shrink-0" /><div className="min-w-0 break-words"><p>Diselesaikan oleh: <span className="font-medium">{task.completer_name || 'Belum tercatat'}</span></p>{task.completed_at && <time dateTime={task.completed_at}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(task.completed_at))} WIB</time>}</div></div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button type="submit" disabled={isBusy} className="font-semibold text-blue-700">{isBusy ? 'Menyimpan...' : 'Simpan deadline'}</button>
              {task.deadline && <button type="button" disabled={isBusy} className="text-rose-600" onClick={async () => { if (await onUpdateDeadline(task.id, null)) setEditingDeadline(false) }}>Hapus deadline</button>}
              <button type="button" disabled={isBusy} className="text-slate-500" onClick={() => setEditingDeadline(false)}>Batal</button>
            </div>
          </form>
        ) : (
          <button type="button" disabled={isBusy} aria-label={`${task.deadline ? 'Ubah' : 'Tambah'} deadline ${task.title}`} onClick={() => { setDraftDeadline(task.deadline || ''); setEditingDeadline(true) }} className={`inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] ${deadline ? `task-tag tag-${deadline.tone}` : 'text-slate-500 hover:bg-slate-50 hover:text-blue-700'}`}>
            <CalendarDays size={12} />
            {deadline ? <><span>{deadline.label}</span><span aria-hidden="true">·</span><time dateTime={task.deadline}>{deadline.date}</time></> : 'Tambah deadline'}
          </button>
        )}
      </div>
      <div className="mt-3 space-y-1.5 text-[11px] leading-5 text-slate-500">
        <p className="flex items-start gap-1.5"><UserRound size={12} className="mt-1 shrink-0" /><span className="min-w-0 break-words">Dibuat oleh: <span className="font-medium text-slate-700">{task.creator_name || 'Belum tercatat'}</span></span></p>
        {task.status === 'done' && (
          <div className="flex items-start gap-1.5 text-emerald-700"><CircleCheck size={12} className="mt-1 shrink-0" /><div className="min-w-0 break-words"><p>Diselesaikan oleh: <span className="font-medium">{task.completer_name || 'Belum tercatat'}</span></p>{task.completed_at && <time dateTime={task.completed_at}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(task.completed_at))} WIB</time>}</div></div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <time dateTime={task.created_at} className="flex items-center gap-1.5 text-[11px] text-slate-500"><CalendarDays size={12} />{dateFormatter.format(new Date(task.created_at))}</time>
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
