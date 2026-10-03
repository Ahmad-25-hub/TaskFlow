import { useEffect, useState } from 'react'
import { Copy, LoaderCircle, RefreshCw, UserMinus, Users } from 'lucide-react'
import Modal from './Modal'
import { workspaceApi } from '../api/workspaces'

export default function WorkspaceSettings({ workspace, onClose, onUpdated }) {
  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const owner = workspace.role === 'owner'
  useEffect(() => {
    const controller = new AbortController()
    workspaceApi.members(workspace.id, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setMembers(result) })
      .catch((issue) => { if (!controller.signal.aborted) setError(issue.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [workspace.id])

  async function action(operation, success) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await operation(); setMessage(success) } catch (issue) { setError(issue.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal title="Anggota & pengaturan" description="Kelola anggota, kode undangan, dan detail workspace." onClose={onClose} busy={busy}>
      {error && <p role="alert" className="error-message mb-4">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">{message}</p>}
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-xs font-semibold text-slate-600">Kode undangan</p>
        <div className="mt-2 flex items-center justify-between gap-3"><code className="select-all text-xl font-bold tracking-[0.15em] text-blue-700" data-testid="invite-code">{workspace.invite_code}</code><button type="button" className="secondary-button !bg-white" disabled={busy} onClick={() => action(() => navigator.clipboard.writeText(workspace.invite_code), 'Kode undangan disalin.')}><Copy size={14} />Salin</button></div>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">Bagikan kode ini agar temanmu bisa bergabung.</p>
        {owner && <button type="button" disabled={busy} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-700" onClick={() => action(async () => onUpdated(await workspaceApi.rotateInvite(workspace.id)), 'Kode baru siap dibagikan. Kode lama tidak berlaku.')}><RefreshCw size={12} />Buat kode baru</button>}
      </div>
      {owner && <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); action(async () => onUpdated(await workspaceApi.update(workspace.id, { name, description })), 'Workspace berhasil diperbarui.') }}>
        <label className="form-label block">Nama workspace<input data-autofocus required minLength={2} maxLength={80} disabled={busy} value={name} onChange={(event) => setName(event.target.value)} className="field mt-2 w-full px-3 py-2.5 text-sm" /></label>
        <label className="form-label block">Deskripsi workspace<textarea maxLength={300} rows={2} disabled={busy} value={description} onChange={(event) => setDescription(event.target.value)} className="field mt-2 w-full resize-y px-3 py-2.5 text-sm" /></label>
        <button type="submit" disabled={busy} className="primary-button">Simpan perubahan{busy && <LoaderCircle size={14} className="animate-spin" />}</button>
      </form>}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Users size={16} className="text-slate-400" />Anggota workspace <span className="text-xs font-normal text-slate-400">({members.length})</span></h3>
        {loading ? <p className="py-3 text-xs text-slate-500">Memuat anggota...</p> : members.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
          <div className="min-w-0"><p className="break-words text-xs font-semibold">{member.name} <span className="ml-1 font-normal text-slate-400">{member.role === 'owner' ? 'Owner' : 'Member'}</span></p><p className="mt-1 break-all text-[11px] text-slate-400">{member.email}</p></div>
          {owner && member.role !== 'owner' && <button type="button" disabled={busy} aria-label={`Keluarkan ${member.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500" onClick={() => action(async () => { const updated = await workspaceApi.removeMember(workspace.id, member.id); setMembers(await workspaceApi.members(workspace.id)); onUpdated(updated) }, 'Anggota dikeluarkan dari workspace.')}><UserMinus size={16} /></button>}
        </div>)}
      </div>
    </Modal>
  )
}
