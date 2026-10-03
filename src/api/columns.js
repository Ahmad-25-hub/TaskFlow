import { request, jsonBody } from './client'

const endpoint = (workspaceId) => `columns.php?workspace_id=${encodeURIComponent(workspaceId)}`
export const columnApi = {
  reorder: async (workspaceId, columns) => (await request(endpoint(workspaceId), jsonBody('PATCH', { column_ids: columns.map((column) => column.id) }))).columns,
  list: async (workspaceId, signal) => (await request(endpoint(workspaceId), { signal })).columns,
  create: async (workspaceId, values) => (await request(endpoint(workspaceId), jsonBody('POST', values))).column,
  remove: (workspaceId, id) => request(`${endpoint(workspaceId)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
