async function request(path = '', options = {}) {
  const response = await fetch(`/api/tasks.php${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  let result
  try { result = await response.json() } catch { throw new Error('Respons server tidak valid.') }
  if (!response.ok) throw new Error(result.error || 'Permintaan gagal.')
  return result
}

export const taskApi = {
  list: async () => (await request()).tasks,
  create: async (values) => (await request('', { method: 'POST', body: JSON.stringify(values) })).task,
  move: (id, status) => request(`?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id) => request(`?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
