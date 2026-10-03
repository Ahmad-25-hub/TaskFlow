import { useEffect, useRef, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { COLOR_OPTIONS } from '../data/tasks'

export default function AddColumnModal({ onClose, onSubmit, serverError }) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('indigo')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dialogRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  useEffect(() => {
    if (!saving && document.activeElement === document.body) inputRef.current?.focus()
  }, [saving])

  function handleKeyDown(event) {
    if (event.key === 'Escape' && !saving) onClose()
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')
    if (!focusable.length) { event.preventDefault(); return }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!label.trim()) {
      setError('Nama kolom wajib diisi.')
      inputRef.current?.focus()
      return
    }
    if (saving) return
    setSaving(true)
    try { await onSubmit({
      label: label.trim(),
      description: description.trim(),
      color,
    }) } finally { setSaving(false); inputRef.current?.focus() }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-column-title"
        aria-describedby="modal-column-description"
        className="modal-panel"
        onKeyDown={handleKeyDown}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 id="modal-column-title" className="text-xl font-bold tracking-tight">
              Tambah kolom
            </h2>
            <p id="modal-column-description" className="mt-2 text-xs leading-6 text-slate-500">
              Buat tahap baru yang sesuai dengan alur kerja tim.
            </p>
          </div>
          <button
            type="button"
                    disabled={saving}
            aria-label="Tutup form"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {serverError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{serverError}</p>}

          <label htmlFor="column-label" className="form-label">
            Nama kolom <span className="text-blue-600">*</span>
          </label>
          <input disabled={saving}
            ref={inputRef}
            id="column-label"
            className="field mt-2 w-full px-3.5 py-3 text-sm"
            placeholder="Contoh: In Review, QA / Testing, Backlog, Deploy..."
            required
            maxLength={50}
            value={label}
            onChange={(event) => { setLabel(event.target.value); setError('') }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'column-label-error' : undefined}
          />
          {error && <p id="column-label-error" className="mt-2 text-xs text-red-500">{error}</p>}

          <div className="mt-5">
            <label htmlFor="column-description" className="form-label">
              Deskripsi <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <input disabled={saving}
              id="column-description"
              maxLength={255}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="field mt-2 w-full px-3.5 py-3 text-sm"
              placeholder="Contoh: Tahap peninjauan kode sebelum pengujian..."
            />
          </div>

          <div className="mt-5">
            <span className="form-label block mb-2">Pilih warna kolom</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((opt) => {
                const isSelected = color === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={saving}
                    aria-pressed={isSelected}
                    onClick={() => setColor(opt.id)}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="size-3.5 rounded-full shrink-0" style={{ backgroundColor: opt.bg }} />
                    <span className="truncate">{opt.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">Pratinjau label</span>
            <span className={`task-tag tag-${color}`}>
              <span className="size-1 rounded-full bg-current" />
              {label.trim() || 'Nama Kolom'}
            </span>
          </div>

          <div className="mt-7 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
                    disabled={saving}
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Batal
            </button>
            <button disabled={saving} type="submit" className="primary-button">
              {saving ? 'Menyimpan...' : 'Buat kolom'}
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
