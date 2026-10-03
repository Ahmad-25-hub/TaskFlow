import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import KanbanColumn from './KanbanColumn'
import { TASK_STATUSES } from '../data/tasks'

export default function KanbanBoard({
  pendingIds = new Set(),
  tasks,
  allTasks,
  columns = TASK_STATUSES,
  onAddTask,
  onDeleteTask,
  onMoveTask,
  onOpenAddColumn,
  onDeleteColumn,
  onMoveColumn,
  isSavingColumnOrder,
  isFiltered,
}) {
  const [draggedId, setDraggedId] = useState(null)
  const [draggedColumnId, setDraggedColumnId] = useState(null)
  const [columnTarget, setColumnTarget] = useState(null)
  const boardRef = useRef(null)

  function endColumnDrag() {
    setDraggedColumnId(null)
    setColumnTarget(null)
  }

  function columnPlacement(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const horizontal = window.matchMedia('(min-width: 768px)').matches
    return (horizontal ? event.clientX > rect.left + rect.width / 2 : event.clientY > rect.top + rect.height / 2) ? 'after' : 'before'
  }

  function dragOverColumn(event, id) {
    if (!draggedColumnId || isSavingColumnOrder) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const placement = columnPlacement(event)
    setColumnTarget(id === draggedColumnId ? null : { id, placement })
    const rect = boardRef.current.getBoundingClientRect()
    if (event.clientX > rect.right - 18) boardRef.current.scrollBy({ left: 12 })
    else if (event.clientX < rect.left + 18) boardRef.current.scrollBy({ left: -12 })
  }

  function dropColumn(event, id) {
    if (!draggedColumnId) return
    event.preventDefault()
    event.stopPropagation()
    onMoveColumn(draggedColumnId, id, columnPlacement(event))
    endColumnDrag()
  }

  function dropTask(event, status) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain')
    const task = allTasks.find((item) => item.id === id)
    if (task && !pendingIds.has(id) && task.status !== status) onMoveTask(id, status)
    setDraggedId(null)
  }

  return (
    <div ref={boardRef} className="flex flex-col md:flex-row items-stretch md:items-start gap-5 overflow-x-auto pb-4 pt-1">
      <p id="column-drag-help" className="sr-only">Tarik judul kolom ke posisi tujuan. Dengan keyboard, fokuskan judul lalu gunakan tombol panah kiri atau kanan.</p>
      {columns.map((status, index) => (
        <div key={status.id} data-column-id={status.id}
          className={`column-slot w-full md:w-[280px] md:min-w-[280px] md:flex-1 shrink-0 ${draggedColumnId === status.id ? 'column-dragging' : ''} ${columnTarget?.id === status.id ? `column-insert-${columnTarget.placement}` : ''}`}
          onDragOver={(event) => dragOverColumn(event, status.id)}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setColumnTarget((current) => current?.id === status.id ? null : current) }}
          onDrop={(event) => dropColumn(event, status.id)}>
          <KanbanColumn
            pendingIds={pendingIds}
            status={status}
            columns={columns}
            tasks={tasks.filter((task) => task.status === status.id)}
            totalCount={allTasks.filter((task) => task.status === status.id).length}
            onAddTask={onAddTask}
            onDeleteTask={onDeleteTask}
            onMoveTask={onMoveTask}
            onDropTask={dropTask}
            onDeleteColumn={onDeleteColumn}
            onColumnDragStart={setDraggedColumnId}
            onColumnDragEnd={endColumnDrag}
            onColumnKeyDown={(event) => {
              const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
              if (!direction || isSavingColumnOrder || !columns[index + direction]) return
              event.preventDefault()
              onMoveColumn(status.id, columns[index + direction].id, direction < 0 ? 'before' : 'after')
            }}
            isSavingColumnOrder={isSavingColumnOrder}
            draggedId={draggedId}
            onDragChange={setDraggedId}
            isFiltered={isFiltered}
          />
        </div>
      ))}

      {onOpenAddColumn && (
        <div className="w-full md:w-[160px] shrink-0">
          <button
            type="button"
            onClick={onOpenAddColumn}
            disabled={isSavingColumnOrder}
            aria-label="Tambah kolom baru"
            className="add-column-card flex items-center gap-3 w-full min-h-[62px] p-4 text-slate-500 group"
          >
            <Plus size={17} />
            <span className="text-xs font-semibold">Tambah kolom</span>
          </button>
        </div>
      )}
    </div>
  )
}
