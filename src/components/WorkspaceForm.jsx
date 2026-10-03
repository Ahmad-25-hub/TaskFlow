import { useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import Modal from './Modal'
import { workspaceApi } from '../api/workspaces'

export default function WorkspaceForm({ mode, onClose, onSuccess }) {
  const create = mode === 'create'
  const [values, setValues] = useState({ name: '', description: '', invite_code: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  function update(event) { setValues((current) => ({ ...current, [event.target.name]: event.target.value })) }
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try { onSuccess(await (create ? workspaceApi.create(values) : workspaceApi.join(values))) }
    catch (issue) { setError(issue.message); setBusy(false) }
  }
  return (
    <Modal title={create ? 'Buat workspace' : 'Gabung workspace'} description={create ? 'Workspace akan punya papan tugas dan anggota sendiri.' : 'Masukkan kode undangan 8 karakter dari anggota workspace.'} busy={busy} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        {error && <p role="alert" className="error-message">{error}</p>}
        {create ? <>
          <label className="form-label block">Nama workspace<input data-autofocus name="name" required minLength={2} maxLength={80} disabled={busy} value={values.name} onChange={update} placeholder="Contoh: Tim Hackathon" className="field mt-2 w-full px-3.5 py-3 text-sm" /></label>
          <label className="form-label block">Deskripsi (opsional)<textarea name="description" rows={3} maxLength={300} disabled={busy} value={values.description} onChange={update} placeholder="Apa yang sedang timmu kerjakan?" className="field mt-2 w-full resize-y px-3.5 py-3 text-sm" /></label>
        </> : <label className="form-label block">Kode undangan<input data-autofocus name="invite_code" required minLength={8} maxLength={8} disabled={busy} value={values.invite_code} onChange={update} placeholder="A1B2C3D4" className="field mt-2 w-full px-3.5 py-3 text-lg uppercase tracking-[0.2em]" /></label>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" disabled={busy} onClick={onClose} className="secondary-button">Batal</button><button type="submit" disabled={busy} className="primary-button">{create ? 'Buat workspace' : 'Gabung workspace'}{busy ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowRight size={15} />}</button></div>
      </form>
    </Modal>
  )
}
