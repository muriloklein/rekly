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
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="text-lg font-bold text-indigo-600">Rekly</span>
        <div className="flex gap-4">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`text-sm font-medium transition ${path.startsWith(l.href) ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <button onClick={logout} className="text-sm text-gray-400 hover:text-red-600 transition">Sair</button>
    </nav>
  )
}