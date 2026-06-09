'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/subscriptions', label: 'Assinaturas' },
  { href: '/payments', label: 'Pagamentos' },
  { href: '/categories', label: 'Categorias' },
]

export default function NavBar() {
  const path = usePathname()
  const router = useRouter()
  const publicas = ['/', '/login', '/register', '/forgot-password', '/reset-password']
  if (publicas.some(p => path === p || path.startsWith('/reset-password'))) return null

  async function logout() {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-indigo-600 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-white text-2xl font-black tracking-tight select-none hover:opacity-80 transition">
          Rekly
        </Link>
        <div className="flex gap-6">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`text-sm font-medium transition ${
                path.startsWith(l.href)
                  ? 'text-white underline underline-offset-4'
                  : 'text-indigo-200 hover:text-white'
              }`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/notifications"
          className={`text-sm font-medium transition flex items-center gap-1.5 ${
            path.startsWith('/notifications') ? 'text-white' : 'text-indigo-200 hover:text-white'
          }`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Notificações
        </Link>
        <Link href="/profile"
          className={`text-sm font-medium transition ${
            path.startsWith('/profile') ? 'text-white' : 'text-indigo-200 hover:text-white'
          }`}>
          Perfil & Privacidade
        </Link>
        <button
          onClick={logout}
          className="text-sm bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-1.5 rounded-full transition"
        >
          Sair
        </button>
      </div>
    </nav>
  )
}