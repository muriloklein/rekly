'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Perfil {
  id: number
  nome: string
  email: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Export states
  const [exportando, setExportando] = useState(false)
  const [formatoExport, setFormatoExport] = useState<'json' | 'csv'>('json')
  const [confirmandoExport, setConfirmandoExport] = useState(false)
  const [exportOk, setExportOk] = useState(false)

  // Delete states
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [digitandoConfirmacao, setDigitandoConfirmacao] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState('')

  const handle401 = useCallback(() => {
    window.location.href = '/login'
  }, [])

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const res = await fetch('/api/auth', {
          credentials: 'include',
        })

        if (res.status === 401) {
          window.location.href = '/login'
          return
        }

        const data = await res.json()

        if (!data.usuario) {
          window.location.href = '/login'
          return
        }

        setPerfil(data.usuario)
      } catch (error) {
        console.error(error)
      } finally {
        setCarregando(false)
      }
    }

    carregarPerfil()
  }, [])

  async function exportarDados() {
    setExportando(true)
    setExportOk(false)
    try {
      const res = await fetch(`/api/export?formato=${formatoExport}`, { credentials: 'include' })
      if (!res.ok) { setExportando(false); return }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ext = formatoExport === 'csv' ? 'csv' : 'json'
      a.href = url
      a.download = `rekly_meus_dados.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setExportOk(true)
      setConfirmandoExport(false)
    } finally {
      setExportando(false)
    }
  }

  async function excluirConta() {
    if (digitandoConfirmacao !== 'EXCLUIR MINHA CONTA') return
    setExcluindo(true)
    setErroExclusao('')
    try {
      const res = await fetch('/api/export', { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        router.push('/login?conta=excluida')
      } else {
        const d = await res.json()
        setErroExclusao(d.erro ?? 'Erro ao excluir conta.')
        setExcluindo(false)
      }
    } catch {
      setErroExclusao('Erro de conexão. Tente novamente.')
      setExcluindo(false)
    }
  }

  if (carregando) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-center text-gray-400 py-20 text-sm">Carregando perfil...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meu perfil</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gerencie seus dados pessoais e privacidade</p>
      </div>

      {/* Dados do perfil */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Dados da conta</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Nome</p>
            <p className="text-sm font-medium text-gray-800">{perfil?.nome ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">E-mail</p>
            <p className="text-sm font-medium text-gray-800">{perfil?.email ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Exportação LGPD */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Exportar meus dados (LGPD)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Conforme a Lei Geral de Proteção de Dados, você tem o direito de receber uma cópia
              de todos os seus dados armazenados no Rekly.
            </p>
          </div>
        </div>

        {exportOk && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Arquivo baixado com sucesso.
          </div>
        )}

        {!confirmandoExport ? (
          <button
            onClick={() => { setConfirmandoExport(true); setExportOk(false) }}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            Solicitar exportação
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Escolha o formato e confirme para gerar o arquivo com todos os seus dados:
              perfil, assinaturas, categorias personalizadas e histórico de pagamentos.
            </p>

            {/* Seletor de formato */}
            <div className="flex gap-2">
              {(['json', 'csv'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormatoExport(f)}
                  className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition ${
                    formatoExport === f
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
              <span className="text-xs text-gray-400 self-center ml-1">
                {formatoExport === 'json' ? 'Estruturado, ideal para desenvolvedores' : 'Planilha, ideal para leitura direta'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportarDados}
                disabled={exportando}
                className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition font-medium flex items-center gap-2"
              >
                {exportando && (
                  <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
                {exportando ? 'Gerando arquivo...' : `Baixar em ${formatoExport.toUpperCase()}`}
              </button>
              <button
                onClick={() => setConfirmandoExport(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exclusão de conta */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-red-700">Excluir minha conta</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Remove permanentemente sua conta e todos os dados associados — assinaturas,
              pagamentos, categorias e histórico. Esta ação é irreversível.
            </p>
          </div>
        </div>

        {!confirmandoExclusao ? (
          <button
            onClick={() => { setConfirmandoExclusao(true); setDigitandoConfirmacao(''); setErroExclusao('') }}
            className="text-sm text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg transition font-medium"
          >
            Excluir conta permanentemente
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              ⚠ Atenção: todos os seus dados serão apagados definitivamente e não poderão ser recuperados.
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Para confirmar, digite exatamente: <span className="font-mono font-semibold text-gray-700">EXCLUIR MINHA CONTA</span>
              </label>
              <input
                type="text"
                value={digitandoConfirmacao}
                onChange={e => { setDigitandoConfirmacao(e.target.value); setErroExclusao('') }}
                placeholder="Digite aqui para confirmar"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 font-mono"
              />
            </div>

            {erroExclusao && (
              <p className="text-xs text-red-600">{erroExclusao}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={excluirConta}
                disabled={digitandoConfirmacao !== 'EXCLUIR MINHA CONTA' || excluindo}
                className="text-sm bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition font-medium flex items-center gap-2"
              >
                {excluindo && (
                  <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
                {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button
                onClick={() => { setConfirmandoExclusao(false); setDigitandoConfirmacao(''); setErroExclusao('') }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}