import { useState } from 'react'
import { ArrowRight, CheckCheck, Layers2, LoaderCircle, Users } from 'lucide-react'
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
    <main className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 sm:px-9 lg:min-h-[calc(100vh-76px)] lg:grid-cols-2 lg:gap-20 lg:py-16">
      <section className="auth-story hidden rounded-[28px] p-10 lg:block">
        <p className="eyebrow mb-6 !text-indigo-200">A LITTLE TEAMWORK GOES A LONG WAY</p>
        <h1 className="max-w-sm text-4xl font-bold leading-tight tracking-tight text-white">Ide besar dimulai dari tim yang terhubung<span className="text-indigo-300">.</span></h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-indigo-100">Buat ruang kerja, ajak orang-orang hebat, dan ubah setiap ide menjadi langkah yang nyata.</p>
        <div className="mt-10 grid grid-cols-3 gap-3" aria-hidden="true">
          {['To Do', 'In Progress', 'Done'].map((label, index) => (
            <div key={label} className="rounded-xl bg-white/10 p-3">
              <span className="text-[10px] font-semibold text-indigo-100">{label}</span>
              <div className={`mt-3 rounded-lg bg-white p-3 ${index === 1 ? 'translate-y-4' : ''}`}>
                <span className={`block h-1 w-6 rounded-full ${index === 0 ? 'bg-indigo-300' : index === 1 ? 'bg-amber-300' : 'bg-emerald-300'}`} />
                <span className="mt-3 block h-1.5 w-full rounded-full bg-slate-200" /><span className="mt-2 block h-1 w-2/3 rounded-full bg-slate-100" />
                <span className="mt-5 flex size-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-400"><CheckCheck size={12} /></span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex items-center gap-3 text-xs text-indigo-200"><Users size={17} />Ruang berbeda, semangat yang sama.</div>
      </section>
      <section className="mx-auto w-full max-w-md">
        <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Layers2 size={24} /></span>
        <p className="eyebrow mb-3">WELCOME TO YOUR NEXT BIG IDEA</p>
        <h2 className="text-3xl font-bold tracking-tight">{register ? 'Mulai perjalananmu.' : 'Selamat datang kembali.'}</h2>
        <p className="mb-8 mt-3 text-sm leading-6 text-slate-500">{register ? 'Buat akun untuk memulai atau bergabung dengan workspace timmu.' : 'Masuk untuk melanjutkan ide dan pekerjaan bersama timmu.'}</p>
        <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
          {error && <p role="alert" className="error-message">{error}</p>}
          {register && <label className="form-label block">Nama lengkap<input name="name" autoComplete="name" required minLength={2} maxLength={80} value={values.name} onChange={update} disabled={busy} className="field mt-2 w-full px-4 py-3 text-sm" placeholder="Nama kamu" /></label>}
          <label className="form-label block">Email<input name="email" type="email" autoComplete="email" required maxLength={190} value={values.email} onChange={update} disabled={busy} className="field mt-2 w-full px-4 py-3 text-sm" placeholder="nama@email.com" /></label>
          <label className="form-label block">Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={6} maxLength={72} value={values.password} onChange={update} disabled={busy} className="field mt-2 w-full px-4 py-3 text-sm" placeholder={register ? 'Minimal 6 karakter' : 'Password akunmu'} /></label>
          {register && <label className="form-label block">Konfirmasi password<input name="confirmation" type="password" autoComplete="new-password" required maxLength={72} value={values.confirmation} onChange={update} disabled={busy} className="field mt-2 w-full px-4 py-3 text-sm" placeholder="Ketik ulang password" /></label>}
          <button type="submit" disabled={busy} className="primary-button w-full !py-3">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}{busy ? 'Sebentar...' : register ? 'Buat akun' : 'Masuk'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">{register ? 'Sudah punya akun?' : 'Belum punya akun?'} <button type="button" disabled={busy} onClick={() => { setRegister(!register); setError(''); setValues((current) => ({ ...current, password: '', confirmation: '' })) }} className="font-semibold text-indigo-600 hover:text-indigo-800">{register ? 'Masuk di sini' : 'Daftar sekarang'}</button></p>
      </section>
    </main>
  )
}
