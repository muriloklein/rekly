'use client'

import { useState, useEffect, useCallback } from 'react'

interface Preferencias {
  notificar_vencimento: boolean
  notificar_atraso: boolean
  dias_antecedencia: number
}

export default function NotificacoesPage() {
  const [prefs, setPrefs] = useState<Preferencias>({
    notificar_vencimento: true,
    notificar_atraso: true,
    dias_antecedencia: 7,
  })
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const handle401 = useCallback(() => {
    window.location.href = '/login'
  }, [])

  useEffect(() => {
    fetch('/api/notifications', { credentials: 'include' })
      .then(async r => {
        if (r.status === 401) {
          handle401()
          return null
        }

        return r.json()
      })
      .then(d => {
        if (!d) return

        if (d.preferencias) {
          setPrefs(d.preferencias)
        }

        setCarregando(false)
      })
      .catch(() => {
        setCarregando(false)
      })
  }, [handle401])

  async function salvar() {
    setSalvando(true)
    setSucesso(false)
    setErro('')
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (res.ok) {
        setSucesso(true)
        setTimeout(() => setSucesso(false), 3000)
      } else {
        const d = await res.json()
        setErro(d.erro ?? 'Erro ao salvar preferências.')
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-center text-gray-400 py-20 text-sm">Carregando preferências...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Notificações</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Configure como e quando o Rekly deve te alertar por e-mail.
        </p>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

        {/* Lembrete de vencimento */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Lembrete de vencimento</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Receba um e-mail alguns dias antes do vencimento de cada assinatura ativa.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPrefs(p => ({ ...p, notificar_vencimento: !p.notificar_vencimento }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer ${
              prefs.notificar_vencimento ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={prefs.notificar_vencimento}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.notificar_vencimento ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Dias de antecedência */}
        {prefs.notificar_vencimento && (
          <div className="ml-12 pl-0 border-l-2 border-indigo-100 pl-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Quantos dias antes do vencimento enviar o alerta?
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={30}
                value={prefs.dias_antecedencia}
                onChange={e => setPrefs(p => ({ ...p, dias_antecedencia: Number(e.target.value) }))}
                className="w-40 accent-indigo-600"
              />
              <span className="text-sm font-semibold text-indigo-700 w-20">
                {prefs.dias_antecedencia} {prefs.dias_antecedencia === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-300 w-40 mt-1">
              <span>1 dia</span>
              <span>30 dias</span>
            </div>
          </div>
        )}

        <hr className="border-gray-100" />

        {/* Alerta de atraso */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Alerta de pagamento atrasado</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Receba um e-mail quando o dia de cobrança de uma assinatura passar sem registro de pagamento.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPrefs(p => ({ ...p, notificar_atraso: !p.notificar_atraso }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer ${
              prefs.notificar_atraso ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={prefs.notificar_atraso}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs.notificar_atraso ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info: como funciona */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Como funciona</h3>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">•</span>
            Os alertas são processados <strong className="text-gray-600">uma vez por dia</strong>, automaticamente.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">•</span>
            Você receberá <strong className="text-gray-600">no máximo um e-mail por assinatura por dia</strong> — sem spam.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">•</span>
            Apenas assinaturas com status <strong className="text-gray-600">ativo</strong> são consideradas.
          </li>
        </ul>
      </div>

      {/* Feedback */}
      {sucesso && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Preferências salvas com sucesso!
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          {erro}
        </div>
      )}

      {/* Botão salvar */}
      <div className="flex justify-end">
        <button
          onClick={salvar}
          disabled={salvando}
          className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition font-medium flex items-center gap-2"
        >
          {salvando && (
            <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}
          {salvando ? 'Salvando...' : 'Salvar preferências'}
        </button>
      </div>
    </div>
  )
}
