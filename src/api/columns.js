const DEFAULT_COLUMNS = [
  { id: 'todo', label: 'To Do', description: 'Ide yang siap dikerjakan', color: 'indigo', sort_order: 1 },
  { id: 'in_progress', label: 'In Progress', description: 'Sedang dibawa jadi nyata', color: 'amber', sort_order: 2 },
  { id: 'done', label: 'Done', description: 'Satu langkah lebih dekat', color: 'emerald', sort_order: 3 },
]

async function columnRequest(path = '', options = {}) {
  const response = await fetch(`/api/columns.php${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  let result
  try { result = await response.json() } catch { throw new Error('Respons server tidak valid.') }
  if (!response.ok) {
    const error = new Error(result.error || 'Permintaan gagal.')
    error.status = response.status
    throw error
  }
  return result
}

export const columnApi = {
  reorder: async (columns) => {
    const reordered = columns.map((column, index) => ({ ...column, sort_order: index + 1 }))
    try {
      const data = await columnRequest('', {
        method: 'PATCH',
        body: JSON.stringify({ column_ids: reordered.map((column) => column.id) }),
      })
      try { localStorage.setItem('taskflow_columns', JSON.stringify(data.columns)) } catch {}
      return data.columns
    } catch (issue) {
      if (issue.status && issue.status < 500) throw issue
      // Sama seperti tambah kolom: simpan secara lokal ketika backend tidak tersedia.
      try {
        localStorage.setItem('taskflow_columns', JSON.stringify(reordered))
      } catch {
        throw new Error('Urutan kolom gagal disimpan. Periksa server atau penyimpanan browser.')
      }
      return reordered
    }
  },
  list: async () => {
    try {
      const data = await columnRequest()
      if (data.columns && data.columns.length > 0) {
        try { localStorage.setItem('taskflow_columns', JSON.stringify(data.columns)) } catch {}
        return data.columns
      }
      return DEFAULT_COLUMNS
    } catch {
      try {
        const saved = localStorage.getItem('taskflow_columns')
        if (saved) return JSON.parse(saved)
      } catch {}
      return DEFAULT_COLUMNS
    }
  },
  create: async (values) => {
    try {
      const data = await columnRequest('', { method: 'POST', body: JSON.stringify(values) })
      return data.column
    } catch {
      const baseId = values.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || `col_${Date.now()}`
      const newCol = {
        id: baseId,
        label: values.label,
        description: values.description || '',
        color: values.color || 'indigo',
        sort_order: Date.now(),
      }
      try {
        const saved = localStorage.getItem('taskflow_columns')
        const current = saved ? JSON.parse(saved) : DEFAULT_COLUMNS
        localStorage.setItem('taskflow_columns', JSON.stringify([...current, newCol]))
      } catch {}
      return newCol
    }
  },
  remove: async (id) => {
    try {
      return await columnRequest(`?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {
      try {
        const saved = localStorage.getItem('taskflow_columns')
        if (saved) {
          const current = JSON.parse(saved)
          localStorage.setItem('taskflow_columns', JSON.stringify(current.filter((col) => col.id !== id)))
        }
      } catch {}
      return { deleted: true, id }
    }
  },
}
