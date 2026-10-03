import { request, jsonBody } from './client'

const endpoint = (workspaceId) => `columns.php?workspace_id=${encodeURIComponent(workspaceId)}`
export const columnApi = {
  list: async (workspaceId, signal) => (await request(endpoint(workspaceId), { signal })).columns,
  create: async (workspaceId, values) => (await request(endpoint(workspaceId), jsonBody('POST', values))).column,
  remove: (workspaceId, id) => request(`${endpoint(workspaceId)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
