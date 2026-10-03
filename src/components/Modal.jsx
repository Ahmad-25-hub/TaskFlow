import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, description, busy = false, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const target = ref.current.querySelector('[data-autofocus]') || ref.current.querySelector('button')
    target?.focus()
    return () => { document.body.style.overflow = overflow; previous?.focus() }
  }, [])

  function keyDown(event) {
    if (event.key === 'Escape' && !busy) onClose()
    if (event.key !== 'Tab') return
    const elements = ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')
    const first = elements[0]
    const last = elements[elements.length - 1]
    if (!first) { event.preventDefault(); return }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section ref={ref} role="dialog" aria-modal="true" aria-labelledby="workspace-modal-title" aria-describedby="workspace-modal-description" className="modal-panel" onKeyDown={keyDown}>
        <div className="mb-6 flex items-start justify-between gap-3">
          <div><h2 id="workspace-modal-title" className="text-xl font-bold tracking-tight">{title}</h2><p id="workspace-modal-description" className="mt-2 text-xs leading-6 text-slate-500">{description}</p></div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Tutup dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  )
}
