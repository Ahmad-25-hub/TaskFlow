import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles } from 'lucide-react'
import Modal from './Modal'
import { assistantApi } from '../api/assistant'

const example = 'Saya ada project buat website profil untuk perusahaan, tolong buatkan tugas-tugasnya.'

export default function AIAssistant({ workspace, onClose, onTasksChanged }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [configured, setConfigured] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const inputRef = useRef(null)
  const endRef = useRef(null)
  const sendingRef = useRef(false)
  const retryRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    assistantApi.history(workspace.id)
      .then((data) => { if (!cancelled) { setMessages(data.messages); setConfigured(data.configured) } })
      .catch((issue) => { if (!cancelled) setError(issue.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [workspace.id, attempt])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [messages, busy])
  useEffect(() => { if (!busy && !loading) inputRef.current?.focus() }, [busy, loading])

  async function send(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text || sendingRef.current || configured !== true) return
    sendingRef.current = true
    setBusy(true); setError('')
    const draft = retryRef.current?.text === text ? retryRef.current : { text, id: crypto.randomUUID() }
    retryRef.current = draft
    setMessages((current) => current.some((item) => item.id === `${draft.id}-user`) ? current : [...current, { id: `${draft.id}-user`, role: 'user', text }])
    setInput('')
    try {
      const result = await assistantApi.send(workspace.id, text, draft.id)
      setMessages((current) => [...current.filter((item) => item.id !== draft.id), { id: draft.id, role: 'assistant', text: result.reply, tasks: result.tasks, updated_tasks: result.updated_tasks, deleted_tasks: result.deleted_tasks }])
      if ([result.tasks, result.updated_tasks, result.deleted_tasks].some((tasks) => tasks?.length)) await onTasksChanged(result)
      retryRef.current = null
    } catch (issue) { setError(issue.message); setInput(text) }
    finally { sendingRef.current = false; setBusy(false) }
  }

  return (
    <Modal title="Asisten AI" description={`Bantu rencanakan pekerjaan di ${workspace.name}.`} busy={busy} onClose={onClose}>
      <p className="mb-4 rounded-lg bg-blue-50 p-3 text-xs leading-6 text-blue-900">Minta saran, buat, edit, atau hapus task di workspace ini. Perintah langsung dijalankan; sebutkan nama task dengan jelas. Task baru masuk To Do dengan akunmu sebagai pembuat.</p>
      {loading ? <p role="status" className="py-8 text-center text-sm text-slate-500">Memuat percakapan...</p> : <>
        {configured === false && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800">AI belum aktif. Isi GEMINI_API_KEY di file .env, lalu muat ulang asisten.</p>}
        <div role="log" aria-label="Percakapan AI" aria-live="polite" className="mb-4 max-h-[38dvh] space-y-3 overflow-y-auto pr-1">
          {!messages.length && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-xs leading-6 text-slate-500"><Bot size={22} className="mb-2 text-blue-600" /><p>Mulai dengan ide proyekmu, atau tanyakan cara membagi pekerjaan.</p><button type="button" disabled={configured !== true} className="mt-3 text-left font-medium text-blue-700" onClick={() => { setInput(example); inputRef.current?.focus() }}>Coba: buat task website profil perusahaan</button></div>}
          {messages.map((message) => <div key={message.id} className={`rounded-lg p-3 text-xs leading-6 ${message.role === 'user' ? 'ml-6 bg-blue-50 text-blue-900' : 'mr-3 border border-slate-200 bg-white text-slate-700'}`}>
            <p className="mb-1 flex items-center gap-1.5 font-semibold">{message.role === 'user' ? 'Kamu' : <><Sparkles size={13} />Asisten AI</>}</p>
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
            {[['tasks', 'Dibuat'], ['updated_tasks', 'Diedit'], ['deleted_tasks', 'Dihapus']].map(([key, label]) => message[key]?.length > 0 && <section key={key} aria-label={`Task ${label.toLowerCase()}`} className="mt-3"><p className="font-semibold">{label}</p><ol className="mt-1 list-decimal space-y-2 pl-4">{message[key].map((task) => <li key={task.id}><strong className="break-words">{task.title}</strong><p className="break-words text-slate-500">{task.description}</p></li>)}</ol></section>)}
          </div>)}
          {busy && <p role="status" className="flex items-center gap-2 text-xs text-slate-500"><Sparkles size={14} className="animate-pulse" />AI sedang memproses permintaanmu...</p>}
          <div ref={endRef} />
        </div>
      </>}
      {error && <p role="alert" className="mb-3 error-message">{error}</p>}
      {!loading && configured !== true && <button type="button" className="secondary-button mb-3" onClick={() => { setLoading(true); setError(''); setAttempt((value) => value + 1) }}>Muat ulang asisten</button>}
      <form onSubmit={send} aria-busy={busy}>
        <label htmlFor="ai-message" className="form-label">Pesan untuk AI</label>
        <textarea id="ai-message" ref={inputRef} data-autofocus rows={3} maxLength={4000} value={input} disabled={busy || loading || configured !== true} onChange={(event) => setInput(event.target.value)} placeholder="Contoh: ubah deadline task Desain Homepage menjadi besok, atau hapus task Riset..." className="field mt-2 w-full resize-y px-3 py-2 text-sm" />
        <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[11px] text-slate-400">Maksimal 20 tindakan per pesan.</span><button type="submit" disabled={busy || loading || configured !== true || !input.trim()} className="primary-button"><Send size={14} />{busy ? 'Memproses...' : 'Kirim'}</button></div>
      </form>
    </Modal>
  )
}
