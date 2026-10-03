import { useState } from 'react'
import { ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { authApi } from '../api/auth'

export default function AuthScreen({ onAuthenticated }) {
  const [register, setRegister] = useState(false)
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmation: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (register && values.password !== values.confirmation) { setError('Konfirmasi password belum cocok.'); return }
    setError('')
    setBusy(true)
    try {
      const user = await (register ? authApi.register(values) : authApi.login(values))
      onAuthenticated(user)
    } catch (issue) { setError(issue.message); setBusy(false) }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Cara kerja TaskFlow">
        <p className="eyebrow">SATU TEMPAT UNTUK PEKERJAAN TIM</p>
        <h1 className="mt-4 max-w-lg text-[clamp(32px,4vw,52px)] font-bold leading-[1.12] tracking-tight">Dari rencana ke selesai, tanpa kehilangan arah.</h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">Buat workspace untuk tim, pecah pekerjaan menjadi task, lalu ikuti perkembangannya di papan yang mudah dibaca.</p>
        <div className="auth-preview" aria-hidden="true">
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3"><strong className="text-sm">Papan proyek</strong><span className="text-xs text-slate-500">6 task · 3 tahap</span></div>
          <div className="grid grid-cols-3 gap-2.5">
            {[['To Do', 'Tulis kebutuhan proyek', 'Susun prioritas'], ['In Progress', 'Desain alur utama', 'Uji tampilan mobile'], ['Done', 'Buat workspace', 'Undang anggota']].map(([label, ...items]) => <div key={label} className="auth-preview-column"><p className="mb-3 text-[11px] font-semibold">{label}</p>{items.map((item) => <div key={item} className="auth-preview-card mb-2 text-[10px] leading-4">{item}</div>)}</div>)}
          </div>
        </div>
        <p className="mt-5 flex items-center gap-2 text-xs text-slate-600"><Check size={15} />Terlihat jelas siapa mengerjakan apa dan tahapnya.</p>
      </section>
      <section className="auth-form-area">
       <div className="w-full max-w-sm">
        <p className="eyebrow mb-3">AKUN TASKFLOW</p>
        <h2 className="text-3xl font-bold tracking-tight">{register ? 'Mulai perjalananmu.' : 'Selamat datang kembali.'}</h2>
        <p className="mb-8 mt-3 text-sm leading-6 text-slate-500">{register ? 'Buat akun untuk mengatur pekerjaan bersama tim.' : 'Masuk untuk melihat workspace dan tugas timmu.'}</p>
        <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
          {error && <p role="alert" className="error-message">{error}</p>}
          {register && <label className="form-label block">Nama lengkap<input name="name" autoComplete="name" required minLength={2} maxLength={80} value={values.name} onChange={update} disabled={busy} className="field mt-2 w-full px-4 py-3 text-sm" placeholder="Nama kamu" /></label>}
          <label className="form-label block">Email<input name="email" type="email" autoComplete="email" required maxLength={190} value={values.email} onChange={update} disabled={busy} className="field mt-2 w-full px-4 py-3 text-sm" placeholder="nama@email.com" /></label>
          <label className="form-label block">Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={6} maxLength={72} value={values.password} onChange={update} disabled={busy} className="field mt-2 w-full px-4 py-3 text-sm" placeholder={register ? 'Minimal 6 karakter' : 'Password akunmu'} /></label>
          {register && <label className="form-label block">Konfirmasi password<input name="confirmation" type="password" autoComplete="new-password" required maxLength={72} value={values.confirmation} onChange={update} disabled={busy} className="field mt-2 w-full px-4 py-3 text-sm" placeholder="Ketik ulang password" /></label>}
          <button type="submit" disabled={busy} className="primary-button w-full !py-3">{busy ? <LoaderCircle size={17} className="animate-spin" /> : null}{busy ? 'Sebentar...' : register ? 'Buat akun' : 'Masuk'}{!busy && <ArrowRight size={16} />}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">{register ? 'Sudah punya akun?' : 'Belum punya akun?'} <button type="button" disabled={busy} onClick={() => { setRegister(!register); setError(''); setValues((current) => ({ ...current, password: '', confirmation: '' })) }} className="font-semibold text-blue-700 hover:text-blue-900">{register ? 'Masuk di sini' : 'Daftar sekarang'}</button></p>
       </div>
      </section>
    </main>
  )
}
