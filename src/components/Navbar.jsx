import { Layers2, Sparkles } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="border-b border-slate-200/70 bg-white">
      <nav aria-label="Navigasi utama" className="mx-auto flex h-[76px] max-w-[1480px] items-center justify-between px-5 sm:px-9 lg:px-12">
        <a href="#" aria-label="TaskFlow beranda" className="flex items-center gap-2.5">
          <span className="brand-mark flex size-9 items-center justify-center rounded-xl text-white"><Layers2 size={21} /></span>
          <span className="text-xl font-bold tracking-tight">task<span className="text-indigo-500">flow</span><span className="ml-1 text-indigo-400">.</span></span>
        </a>
        <div className="flex items-center gap-5">
          <span className="hidden items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-[11px] font-semibold text-indigo-500 sm:flex"><Sparkles size={12} />Let's make it happen</span>
          <div className="flex items-center gap-3 border-l border-slate-100 pl-5">
            <span className="hidden text-xs font-medium text-slate-500 md:block">Hackathon workspace</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-[#f0e9df] text-xs font-bold text-[#8a7154]" aria-label="Workspace TaskFlow">TF</span>
          </div>
        </div>
      </nav>
    </header>
  )
}
