import { useEffect, useState } from 'react'
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react'
import { taskApi } from '../api/tasks'
import { columnApi } from '../api/columns'
import { workspaceApi } from '../api/workspaces'
import { workspaceStatistics } from '../utils/statistics'

const time = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })
const cell = 'px-4 py-3 text-left align-top text-xs leading-6'

export default function WorkspaceStatistics({ workspace, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([taskApi.list(workspace.id, controller.signal), columnApi.list(workspace.id, controller.signal), workspaceApi.members(workspace.id, controller.signal)])
      .then(([tasks, columns, members]) => { if (!controller.signal.aborted) { setData({ tasks, columns, members }); setNow(new Date()) } })
      .catch((issue) => { if (!controller.signal.aborted) setError(issue.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [workspace.id, attempt])
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])
  function refresh() { setLoading(true); setError(''); setAttempt((value) => value + 1) }
  const stats = data ? workspaceStatistics(data.tasks, data.columns, data.members, now) : null

  return (
    <main className="board-main min-w-0">
      <button type="button" className="mb-6 flex items-center gap-2 text-xs text-slate-600 hover:text-blue-700" onClick={onBack}><ArrowLeft size={14} />Kembali ke board</button>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><p className="eyebrow">STATISTIK WORKSPACE</p><h1 className="board-title">Statistik workspace</h1><p className="mt-2 break-words text-sm text-slate-600">{workspace.name}</p></div>
        <button type="button" className="secondary-button" disabled={loading} onClick={refresh}><RefreshCw size={15} />Perbarui statistik</button>
      </header>
      {loading ? <p role="status" className="py-12 text-center text-sm text-slate-500">Memuat statistik...</p> : error ? <div><p role="alert" className="error-message">{error}</p><button type="button" className="secondary-button mt-3" onClick={refresh}>Coba lagi</button></div> : stats && (
        <div className="space-y-6">
          <section aria-label="Ringkasan task" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[['Total task', stats.total], ['Selesai', stats.done], ['Belum selesai', stats.open], ['Terlambat', stats.overdue]].map(([label, value]) => <div key={label} aria-label={label} className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><strong className="mt-2 block text-3xl text-slate-800">{value}</strong></div>)}
          </section>
          {stats.total === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">Belum ada task. Tambahkan task di board untuk melihat statistik tim.</p>}
          <section aria-label="Distribusi status" className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold"><BarChart3 size={17} />Distribusi status</h2>
            <p className="mt-2 text-xs text-slate-500">Progress {stats.progress}% · {stats.dueSoon} task jatuh tempo hari ini atau 1–2 hari ke depan · {stats.noDeadline} tanpa deadline.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {stats.statuses.map((column) => <div key={column.id}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="min-w-0 break-words">{column.label}</span><strong className="shrink-0">{column.count} task</strong></div><div role="progressbar" aria-label={`Jumlah task ${column.label}`} aria-valuemin={0} aria-valuemax={Math.max(stats.total, 1)} aria-valuenow={column.count} className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${stats.total ? column.count / stats.total * 100 : 0}%` }} /></div></div>)}
            </div>
          </section>
          <section aria-label="Kontribusi anggota" className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold">Kontribusi anggota</h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">Dihitung dari task yang masih ada. Jumlah selesai mencatat pelaku terakhir untuk task yang saat ini berada di Done, bukan riwayat semua penyelesaian.</p>
            <div className="mt-4 max-w-full overflow-x-auto"><table className="w-full min-w-[480px]"><caption className="sr-only">Jumlah task dibuat dan diselesaikan per orang</caption><thead className="bg-slate-50"><tr><th scope="col" className={cell}>Nama</th><th scope="col" className={cell}>Keanggotaan</th><th scope="col" className={cell}>Dibuat</th><th scope="col" className={cell}>Diselesaikan</th></tr></thead><tbody>{stats.people.map((person) => <tr key={person.id} className="border-t border-slate-100"><th scope="row" className={`${cell} max-w-64 break-words font-medium`}>{person.name}</th><td className={cell}>{person.active ? 'Anggota aktif' : person.id === 'unrecorded' ? 'Belum tercatat' : 'Di luar anggota aktif'}</td><td className={cell}>{person.created}</td><td className={cell}>{person.completed}</td></tr>)}</tbody></table></div>
          </section>
          <section aria-label="Detail task selesai" className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold">Detail task selesai</h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">Urutan dari penyelesaian terbaru. {stats.unknownCompletion} task belum memiliki catatan penyelesai atau waktu lengkap.</p>
            {!stats.completed.length ? <p className="mt-4 text-sm text-slate-500">Belum ada task yang selesai.</p> : <div className="mt-4 max-w-full overflow-x-auto"><table className="w-full min-w-[640px]"><caption className="sr-only">Pembuat, penyelesai, dan waktu task selesai</caption><thead className="bg-slate-50"><tr>{['Task', 'Dibuat oleh', 'Diselesaikan oleh', 'Waktu selesai (WIB)'].map((label) => <th key={label} scope="col" className={cell}>{label}</th>)}</tr></thead><tbody>{stats.completed.map((task) => <tr key={task.id} className="border-t border-slate-100"><th scope="row" className={`${cell} max-w-72 break-words font-medium`}>{task.title}</th><td className={`${cell} max-w-48 break-words`}>{task.creator_name || 'Belum tercatat'}</td><td className={`${cell} max-w-48 break-words`}>{task.completer_name || 'Belum tercatat'}</td><td className={cell}>{task.completed_at ? <time dateTime={task.completed_at}>{time.format(new Date(task.completed_at))}</time> : 'Belum tercatat'}</td></tr>)}</tbody></table></div>}
          </section>
        </div>
      )}
    </main>
  )
}
