import { useState } from 'react'
import { Plus } from 'lucide-react'
import KanbanColumn from './KanbanColumn'
import { TASK_STATUSES } from '../data/tasks'

export default function KanbanBoard({
  tasks,
  allTasks,
  columns = TASK_STATUSES,
  onAddTask,
  onDeleteTask,
  onMoveTask,
  onOpenAddColumn,
  onDeleteColumn,
  isFiltered,
}) {
  const [draggedId, setDraggedId] = useState(null)

  function dropTask(event, status) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain')
    const task = allTasks.find((item) => item.id === id)
    if (task && task.status !== status) onMoveTask(id, status)
    setDraggedId(null)
  }

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-start gap-5 overflow-x-auto pb-4 pt-1">
      {columns.map((status) => (
        <div key={status.id} className="w-full md:min-w-[310px] md:flex-1 shrink-0">
          <KanbanColumn
            status={status}
            columns={columns}
            tasks={tasks.filter((task) => task.status === status.id)}
            totalCount={allTasks.filter((task) => task.status === status.id).length}
            onAddTask={onAddTask}
            onDeleteTask={onDeleteTask}
            onMoveTask={onMoveTask}
            onDropTask={dropTask}
            onDeleteColumn={onDeleteColumn}
            draggedId={draggedId}
            onDragChange={setDraggedId}
            isFiltered={isFiltered}
          />
        </div>
      ))}

      {onOpenAddColumn && (
        <div className="w-full md:w-[260px] shrink-0">
          <button
            type="button"
            onClick={onOpenAddColumn}
            aria-label="Tambah kolom baru"
            className="add-column-card flex flex-col items-center justify-center gap-3 w-full min-h-[140px] md:min-h-[465px] p-6 text-slate-400 group"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Plus size={20} />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors block">
                Tambah Kolom
              </span>
              <p className="mt-1 text-[11px] text-slate-400">
                Buat tahapan status baru
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
