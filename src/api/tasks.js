import { request, jsonBody } from './client'

const path = (workspaceId, id) => `tasks.php?workspace_id=${encodeURIComponent(workspaceId)}${id ? `&id=${encodeURIComponent(id)}` : ''}`

export const taskApi = {
  list: async (workspaceId, signal) => (await request(path(workspaceId), { signal })).tasks,
  create: async (workspaceId, values) => (await request(path(workspaceId), jsonBody('POST', values))).task,
  move: async (workspaceId, id, status) => (await request(path(workspaceId, id), jsonBody('PATCH', { status }))).task,
  deadline: async (workspaceId, id, deadline) => (await request(path(workspaceId, id), jsonBody('PATCH', { deadline }))).task,
  remove: (workspaceId, id) => request(path(workspaceId, id), { method: 'DELETE' }),
}
