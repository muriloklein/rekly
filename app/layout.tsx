import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import NavBar from './NavBar'
import InactivityGuard from './InactivityGuard'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rekly — Controle de assinaturas',
  description: 'Gerencie suas assinaturas pessoais com facilidade.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <NavBar />
        {/*
          InactivityGuard monitora inatividade globalmente e exibe aviso
          2 min antes do logout automático por expiração de sessão (HU03 / RF01).
        */}
        <InactivityGuard />
        {children}
      </body>
    </html>
  )
}
