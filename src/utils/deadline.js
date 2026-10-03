const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
const display = new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })

export function deadlineInfo(deadline, status, now = new Date()) {
  if (!deadline) return null
  const parts = Object.fromEntries(calendar.formatToParts(now).map(({ type, value }) => [type, value]))
  const today = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
  const date = new Date(`${deadline}T00:00:00Z`)
  const days = Math.round((date.getTime() - today) / 86400000)
  const label = status === 'done' ? 'Selesai' : days < 0 ? 'Terlambat' : days === 0 ? 'Hari ini' : days <= 2 ? 'Segera' : 'Deadline'
  const tone = status === 'done' ? 'emerald' : days < 0 ? 'rose' : days <= 2 ? 'amber' : 'slate'
  return { label, tone, date: display.format(date) }
}
