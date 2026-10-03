import { request, jsonBody } from './client'

const path = (id, action) => `workspaces.php?id=${encodeURIComponent(id)}&action=${action}`
export const workspaceApi = {
  list: async (signal) => (await request('workspaces.php', { signal })).workspaces,
  create: async (values) => (await request('workspaces.php', jsonBody('POST', values))).workspace,
  join: async (values) => (await request('workspaces.php?action=join', jsonBody('POST', values))).workspace,
  update: async (id, values) => (await request(path(id, 'update'), jsonBody('PATCH', values))).workspace,
  rotateInvite: async (id) => (await request(path(id, 'invite'), jsonBody('PATCH'))).workspace,
  members: async (id, signal) => (await request(path(id, 'members'), { signal })).members,
  removeMember: async (id, userId) => (await request(`${path(id, 'member')}&user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' })).workspace,
}
