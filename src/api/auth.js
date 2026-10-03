import { request, jsonBody } from './client'

export const authApi = {
  me: async (signal) => (await request('auth.php', { signal })).user,
  login: async (values) => (await request('auth.php?action=login', jsonBody('POST', values))).user,
  register: async (values) => (await request('auth.php?action=register', jsonBody('POST', values))).user,
  logout: () => request('auth.php?action=logout', jsonBody('POST')),
}
