import { useState } from 'react'
import { Layers2, LoaderCircle, LogOut, Sparkles } from 'lucide-react'

export default function Navbar({ user, onHome, onLogout }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const initials = user ? user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : 'TF'
  async function logout() {
    setBusy(true); setError('')
    try { await onLogout() } catch (issue) { setError(issue.message); setBusy(false) }
  }
  return (
    <header className="border-b border-slate-200/70 bg-white">
      <nav aria-label="Navigasi utama" className="mx-auto flex h-[76px] max-w-[1480px] items-center justify-between px-5 sm:px-9 lg:px-12">
        <button type="button" onClick={onHome} aria-label="TaskFlow beranda" className="flex items-center gap-2.5">
          <span className="brand-mark flex size-9 items-center justify-center rounded-xl text-white"><Layers2 size={21} /></span>
          <span className="text-xl font-bold tracking-tight">task<span className="text-indigo-500">flow</span><span className="ml-1 text-indigo-400">.</span></span>
        </button>
        <div className="flex items-center gap-5">
          {!user && <span className="hidden items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-[11px] font-semibold text-indigo-500 sm:flex"><Sparkles size={12} />Let's make it happen</span>}
          <div className="flex items-center gap-3 border-l border-slate-100 pl-5">
            <span className="hidden max-w-40 truncate text-xs font-medium text-slate-500 sm:block">{user?.name || 'Your next big idea'}</span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f0e9df] text-xs font-bold text-[#8a7154]" aria-label={user ? `Akun ${user.name}` : 'Workspace TaskFlow'}>{initials}</span>
            {user && <button type="button" disabled={busy} onClick={logout} aria-label="Keluar" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-100">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}<span className="hidden sm:inline">Keluar</span></button>}
          </div>
        </div>
      </nav>
      {error && <p role="alert" className="error-message mx-5 mb-3">{error}</p>}
    </header>
  )
}
