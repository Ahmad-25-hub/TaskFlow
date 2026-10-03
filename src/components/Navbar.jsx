import { useState } from 'react'
import { PanelsTopLeft, LoaderCircle, LogOut } from 'lucide-react'

export default function Navbar({ user, onHome, onLogout }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const initials = user ? user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : 'TF'
  async function logout() {
    setBusy(true); setError('')
    try { await onLogout() } catch (issue) { setError(issue.message); setBusy(false) }
  }
  return (
    <header className="app-navbar">
      <nav aria-label="Navigasi utama" className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between px-5 sm:px-8">
        <button type="button" onClick={onHome} aria-label="TaskFlow beranda" className="flex items-center gap-2.5">
          <span className="brand-mark flex size-8 items-center justify-center rounded-md text-white"><PanelsTopLeft size={19} /></span>
          <span className="text-[17px] font-bold tracking-tight">taskflow</span>
        </button>
        <div className="flex items-center gap-3">
          {user && <button type="button" onClick={onHome} className="nav-workspaces">Workspace</button>}
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7eff6] text-xs font-bold text-[#285572]" aria-label={user ? `Akun ${user.name}` : 'Workspace TaskFlow'}>{initials}</span>
          {user && <><span className="hidden max-w-36 truncate text-xs font-medium text-slate-600 sm:block">{user.name}</span><button type="button" disabled={busy} onClick={logout} aria-label="Keluar" className="nav-logout">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}<span className="hidden sm:inline">Keluar</span></button></>}
        </div>
      </nav>
      {error && <p role="alert" className="error-message mx-5 mb-3">{error}</p>}
    </header>
  )
}
