import { useState } from 'react'
import KanbanColumn from './KanbanColumn'
import { TASK_STATUSES } from '../data/tasks'

export default function KanbanBoard({ tasks, allTasks, onAddTask, onDeleteTask, onMoveTask, isFiltered }) {
  const [draggedId, setDraggedId] = useState(null)

  function dropTask(event, status) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain')
    const task = allTasks.find((item) => item.id === id)
    if (task && task.status !== status) onMoveTask(id, status)
    setDraggedId(null)
  }

  return (
    <div className="grid items-start gap-5 md:grid-cols-3 lg:gap-6">
      {TASK_STATUSES.map((status) => (
        <KanbanColumn
          key={status.id}
          status={status}
          tasks={tasks.filter((task) => task.status === status.id)}
          totalCount={allTasks.filter((task) => task.status === status.id).length}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
          onMoveTask={onMoveTask}
          onDropTask={dropTask}
          draggedId={draggedId}
          onDragChange={setDraggedId}
          isFiltered={isFiltered}
        />
      ))}
    </div>
  )
}
