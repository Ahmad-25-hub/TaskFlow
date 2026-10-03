import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Plus, X } from 'lucide-react'
import { TASK_STATUSES } from '../data/tasks'

export default function AddTaskModal({ defaultStatus, onClose, onSubmit, serverError }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState(defaultStatus)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const titleRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    titleRef.current.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape') onClose()
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current.querySelectorAll('button, input, textarea, select')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!title.trim()) { setError('Judul task perlu diisi.'); titleRef.current.focus(); return }
    onSubmit({ title: title.trim(), description: description.trim(), status })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description" className="modal-panel" onKeyDown={handleKeyDown}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500"><Plus size={23} /></span>
            <h2 id="modal-title" className="text-xl font-bold tracking-tight">Langkah baru dimulai di sini.</h2>
            <p id="modal-description" className="mt-2 text-xs leading-6 text-slate-500">Tambahkan task dan bawa idemu satu langkah lebih dekat.</p>
          </div>
          <button type="button" aria-label="Tutup form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          {serverError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{serverError}</p>}
          <label htmlFor="task-title" className="form-label">Judul task <span className="text-indigo-500">*</span></label>
          <input ref={titleRef} id="task-title" className="field mt-2 w-full px-3.5 py-3 text-sm" placeholder="Apa yang ingin kamu kerjakan?" required maxLength={120} value={title} onChange={(event) => { setTitle(event.target.value); setError('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'title-error' : undefined} />
          {error && <p id="title-error" className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-5">
            <label htmlFor="task-description" className="form-label">Deskripsi <span className="font-normal text-slate-400">(opsional)</span></label>
            <textarea id="task-description" rows={4} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} className="field mt-2 w-full resize-y px-3.5 py-3 text-sm" placeholder="Tambahkan detail atau langkah yang perlu dilakukan..." />
          </div>
          <div className="mt-4">
            <label htmlFor="task-status" className="form-label">Status awal</label>
            <select id="task-status" value={status} onChange={(event) => setStatus(event.target.value)} className="field mt-2 w-full px-3.5 py-3 text-sm">
              {TASK_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          <div className="mt-7 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
            <button type="submit" className="primary-button">Buat task<ArrowRight size={15} /></button>
          </div>
        </form>
      </section>
    </div>
  )
}
