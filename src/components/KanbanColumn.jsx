import { useState } from 'react'
import { CircleDashed, CircleCheck, CircleDot, Plus } from 'lucide-react'
import TaskCard from './TaskCard'

const icons = { todo: CircleDashed, in_progress: CircleDot, done: CircleCheck }

export default function KanbanColumn({ status, tasks, totalCount, onAddTask, onDeleteTask, onMoveTask, onDropTask, draggedId, onDragChange, isFiltered }) {
  const [isOver, setIsOver] = useState(false)
  const StatusIcon = icons[status.id]

  function handleDragOver(event) {
    if (!draggedId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsOver(true)
  }

  return (
    <section
      aria-label={status.label}
      className={`kanban-column column-${status.color} ${isOver && draggedId ? 'drop-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOver(false) }}
      onDrop={(event) => { setIsOver(false); onDropTask(event, status.id) }}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StatusIcon size={17} className="column-icon" />
          <h3 className="text-sm font-bold">{status.label}</h3>
          <span className="column-count">{isFiltered ? `${tasks.length}/${totalCount}` : totalCount}</span>
        </div>
        <button type="button" aria-label={`Tambah task ke ${status.label}`} className="column-add" onClick={() => onAddTask(status.id)}><Plus size={18} /></button>
      </div>
      <p className="mb-5 text-[11px] text-slate-400">{status.description}</p>
      <div className="flex flex-col gap-3.5">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onDelete={onDeleteTask} onMove={onMoveTask} onDragChange={onDragChange} isDragging={draggedId === task.id} />
        ))}
        {tasks.length === 0 && (
          <div className="empty-column">
            <StatusIcon size={25} className="mb-3 opacity-40" />
            <p className="text-xs font-medium">{isFiltered ? 'Tidak ada task yang cocok' : 'Belum ada task di sini'}</p>
            <p className="mt-1 text-[11px] leading-5">{isFiltered ? 'Coba kata kunci atau filter lain.' : 'Tambahkan task atau pindahkan kartu ke sini.'}</p>
          </div>
        )}
      </div>
      <button type="button" className="add-column-task mt-4" onClick={() => onAddTask(status.id)}><Plus size={15} />Tambah task</button>
    </section>
  )
}
