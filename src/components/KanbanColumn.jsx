import { useState } from 'react'
import { CircleDashed, CircleCheck, CircleDot, Plus, Trash2, Layers, GripVertical } from 'lucide-react'
import TaskCard from './TaskCard'

const icons = { todo: CircleDashed, in_progress: CircleDot, done: CircleCheck }

export default function KanbanColumn({
  pendingIds = new Set(),
  status,
  columns,
  tasks,
  totalCount,
  onAddTask,
  onDeleteTask,
  onMoveTask,
  onDropTask,
  onDeleteColumn,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnKeyDown,
  isSavingColumnOrder,
  draggedId,
  onDragChange,
  isFiltered,
}) {
  const [isOver, setIsOver] = useState(false)
  const StatusIcon = icons[status.id] || Layers
  const isDefaultColumn = ['todo', 'in_progress', 'done'].includes(status.id)

  function handleDragOver(event) {
    if (!draggedId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsOver(true)
  }

  return (
    <section
      aria-label={status.label}
      className={`kanban-column column-${status.color || 'indigo'} ${isOver && draggedId ? 'drop-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOver(false) }}
      onDrop={(event) => { if (draggedId) { event.stopPropagation(); setIsOver(false); onDropTask(event, status.id) } }}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="column-drag-handle flex items-center gap-2 min-w-0 pr-2"
          data-column-handle={status.id}
          draggable={!isSavingColumnOrder}
          tabIndex={0}
          aria-label={`Atur urutan kolom ${status.label}`}
          aria-describedby="column-drag-help"
          aria-disabled={isSavingColumnOrder}
          title="Tarik untuk memindahkan kolom"
          onKeyDown={onColumnKeyDown}
          onDragStart={(event) => {
            if (isSavingColumnOrder) { event.preventDefault(); return }
            event.stopPropagation()
            event.dataTransfer.setData('application/x-taskflow-column', status.id)
            event.dataTransfer.effectAllowed = 'move'
            const section = event.currentTarget.closest('section')
            event.dataTransfer.setDragImage(section, 30, 25)
            onColumnDragStart(status.id)
          }}
          onDragEnd={onColumnDragEnd}>
          <GripVertical size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
          <StatusIcon size={17} className="column-icon shrink-0" />
          <h3 className="text-sm font-bold truncate" title={status.label}>{status.label}</h3>
          <span className="column-count shrink-0">{isFiltered ? `${tasks.length}/${totalCount}` : totalCount}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isDefaultColumn && onDeleteColumn && (
            <button
              type="button"
              aria-label={`Hapus kolom ${status.label}`}
              className="column-delete"
              disabled={isSavingColumnOrder}
              onClick={() => onDeleteColumn(status.id, status.label)}
              title="Hapus kolom ini"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            type="button"
            aria-label={`Tambah task ke ${status.label}`}
            className="column-add"
            onClick={() => onAddTask(status.id)}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      <p className="mb-4 text-[11px] text-slate-500 truncate" title={status.description}>{status.description || 'Tahapan alur kerja'}</p>
      <div className="flex flex-col gap-2.5">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            isBusy={pendingIds.has(task.id)}
            task={task}
            columns={columns}
            onDelete={onDeleteTask}
            onMove={onMoveTask}
            onDragChange={onDragChange}
            isDragging={draggedId === task.id}
          />
        ))}
        {tasks.length === 0 && (
          <div className="empty-column">
            <StatusIcon size={25} className="mb-3 opacity-40" />
            <p className="text-xs font-medium">{isFiltered ? 'Tidak ada task yang cocok' : 'Belum ada task'}</p>
            <p className="mt-1 text-[11px] leading-5">{isFiltered ? 'Coba pencarian atau filter lain.' : 'Tambahkan task atau pindahkan kartu ke sini.'}</p>
          </div>
        )}
      </div>
      <button type="button" className="add-column-task mt-4" onClick={() => onAddTask(status.id)}><Plus size={15} />Tambah task</button>
    </section>
  )
}
