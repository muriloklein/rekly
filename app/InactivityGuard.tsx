'use client'

/**
 * InactivityGuard — HU03 (RF01)
 *
 * Monitora a inatividade do usuário e exibe um modal de aviso
 * 2 minutos antes do JWT expirar (token tem 30 min = INACTIVIDADE_MS).
 * Se o usuário não reagir, encerra a sessão e redireciona para /login.
 *
 * Eventos que reiniciam o contador: mousemove, keydown, click, scroll, touchstart.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const INATIVIDADE_MS = 30 * 60 * 1000   // 30 minutos (igual ao JWT_EXPIRES)
const AVISO_ANTECEDENCIA_MS = 2 * 60 * 1000  // exibe aviso 2 min antes

const ROTAS_PUBLICAS = ['/', '/login', '/register', '/forgot-password']

export default function InactivityGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const [mostrarAviso, setMostrarAviso] = useState(false)
  const [segundosRestantes, setSegundosRestantes] = useState(120)

  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerLogout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const ehPublica = ROTAS_PUBLICAS.some(
    r => pathname === r || pathname.startsWith('/reset-password')
  )

  const encerrarSessao = useCallback(async () => {
    setMostrarAviso(false)
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    router.push('/login?motivo=inatividade')
    router.refresh()
  }, [router])

  const limparTimers = useCallback(() => {
    if (timerAviso.current) clearTimeout(timerAviso.current)
    if (timerLogout.current) clearTimeout(timerLogout.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [])

  const reiniciarContador = useCallback(() => {
    if (ehPublica) return
    limparTimers()
    setMostrarAviso(false)

    // Avisa 2 min antes do logout
    timerAviso.current = setTimeout(() => {
      setMostrarAviso(true)
      setSegundosRestantes(AVISO_ANTECEDENCIA_MS / 1000)

      countdownRef.current = setInterval(() => {
        setSegundosRestantes(s => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            return 0
          }
          return s - 1
        })
      }, 1000)

      // Logout automático após o período de aviso
      timerLogout.current = setTimeout(encerrarSessao, AVISO_ANTECEDENCIA_MS)
    }, INATIVIDADE_MS - AVISO_ANTECEDENCIA_MS)
  }, [ehPublica, limparTimers, encerrarSessao])

  // Registra eventos de atividade
  useEffect(() => {
    if (ehPublica) return

    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    const handler = () => reiniciarContador()

    eventos.forEach(e => window.addEventListener(e, handler, { passive: true }))
    reiniciarContador() // inicia na montagem

    return () => {
      eventos.forEach(e => window.removeEventListener(e, handler))
      limparTimers()
    }
  }, [ehPublica, reiniciarContador, limparTimers])

  if (!mostrarAviso || ehPublica) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{
        background: 'white', borderRadius: '1rem',
        padding: '2rem', maxWidth: '400px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        {/* Ícone de relógio */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#FEF3C7', margin: '0 auto 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>

        <h2 id="inactivity-title" style={{
          fontSize: '18px', fontWeight: '600',
          color: '#1F2937', margin: '0 0 0.5rem',
        }}>
          Sessão prestes a expirar
        </h2>

        <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 0.5rem' }}>
          Por inatividade, sua sessão será encerrada automaticamente em:
        </p>

        <div style={{
          fontSize: '36px', fontWeight: '700', color: '#4F46E5',
          margin: '0.75rem 0',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {String(Math.floor(segundosRestantes / 60)).padStart(2, '0')}:
          {String(segundosRestantes % 60).padStart(2, '0')}
        </div>

        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 1.5rem' }}>
          Qualquer ação mantém a sessão ativa.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={reiniciarContador}
            style={{
              background: '#4F46E5', color: 'white', border: 'none',
              borderRadius: '0.5rem', padding: '0.6rem 1.5rem',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Continuar sessão
          </button>
          <button
            onClick={encerrarSessao}
            style={{
              background: 'transparent', color: '#6B7280',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem', padding: '0.6rem 1.25rem',
              fontSize: '14px', cursor: 'pointer',
            }}
          >
            Sair agora
          </button>
        </div>
      </div>
    </div>
  )
}
