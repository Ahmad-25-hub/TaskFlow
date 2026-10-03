export async function request(endpoint, options = {}) {
  let response
  try {
    response = await fetch(`/api/${endpoint}`, {
      ...options,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Server belum dapat dihubungi. Pastikan server PHP dan MySQL aktif.')
  }
  let result
  try { result = await response.json() } catch { throw new Error('Respons server tidak valid. Periksa koneksi PHP.') }
  if (!response.ok) {
    if (response.status === 401 && !endpoint.startsWith('auth.php?action=')) {
      window.dispatchEvent(new Event('taskflow:unauthorized'))
    }
    throw new Error(result.error || 'Permintaan gagal.')
  }
  return result
}

export const jsonBody = (method, body = {}) => ({ method, body: JSON.stringify(body) })
