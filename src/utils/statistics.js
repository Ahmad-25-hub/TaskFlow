import { deadlineInfo } from './deadline'

export function workspaceStatistics(tasks, columns, members, now = new Date()) {
  const people = new Map(members.map((member) => [member.id, { id: member.id, name: member.name, active: true, created: 0, completed: 0 }]))
  function count(id, name, field) {
    const key = id || 'unrecorded'
    if (!people.has(key)) people.set(key, { id: key, name: name || 'Belum tercatat', active: false, created: 0, completed: 0 })
    people.get(key)[field]++
  }
  for (const task of tasks) {
    count(task.created_by, task.creator_name, 'created')
    if (task.status === 'done') count(task.completed_by, task.completer_name, 'completed')
  }
  const completed = tasks.filter((task) => task.status === 'done')
  return {
    total: tasks.length,
    done: completed.length,
    open: tasks.length - completed.length,
    progress: tasks.length ? Math.round(completed.length / tasks.length * 100) : 0,
    overdue: tasks.filter((task) => deadlineInfo(task.deadline, task.status, now)?.label === 'Terlambat').length,
    dueSoon: tasks.filter((task) => ['Hari ini', 'Segera'].includes(deadlineInfo(task.deadline, task.status, now)?.label)).length,
    noDeadline: tasks.filter((task) => !task.deadline).length,
    unknownCompletion: completed.filter((task) => !task.completed_by || !task.completed_at).length,
    statuses: columns.map((column) => ({ ...column, count: tasks.filter((task) => task.status === column.id).length })),
    people: [...people.values()].sort((a, b) => b.completed - a.completed || b.created - a.created || a.name.localeCompare(b.name, 'id')),
    completed: [...completed].sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')),
  }
}
