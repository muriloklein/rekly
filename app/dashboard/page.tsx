'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Categoria { id: number; nome: string }

interface ResumoGastos {
  totalNominal: number
  totalCustoReal: number
  totalPorCategoria: { categoriaId: number; nome: string; nominal: number; custoReal: number }[]
}

interface VencimentoProximo {
  id: number
  nomeServico: string
  valor: number
  custoReal: number
  diaCobranca: number
  diasRestantes: number
}

interface IndicadorPendente {
  quantidadePendentes: number
  quantidadeAtrasados: number
  valorPendentes: number
  valorAtrasados: number
}

interface PagamentoRecente {
  id: number
  nomeAssinatura: string
  valor: number
  dataPagamento: string
  status: string
}

interface Sugestao {
  id: number
  assinaturaId: number
  nomeServico: string
  categoria: string
  tipo: 'sobreposicao' | 'desuso'
  descricao: string
}

interface DadosDashboard {
  resumoGastos: ResumoGastos
  vencimentosProximos: VencimentoProximo[]
  indicadores: IndicadorPendente
  pagamentosRecentes: PagamentoRecente[]
  mesAtual: number
  anoAtual: number
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDataBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function nomeMes(mes: number) {
  return new Date(2026, mes - 1, 1).toLocaleString('pt-BR', { month: 'long' })
}

const badgeStatus: Record<string, string> = {
  pago: 'bg-green-100 text-green-700',
  pendente: 'bg-yellow-100 text-yellow-700',
  atrasado: 'bg-red-100 text-red-700',
}

export default function DashboardPage() {
  const router = useRouter()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [dados, setDados] = useState<DadosDashboard | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [visaoReal, setVisaoReal] = useState(false)
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [dispensando, setDispensando] = useState<number | null>(null)

  // Redireciona para login em qualquer resposta 401
  const handle401 = useCallback(() => {
    window.location.href = '/login'
  }, [])

  useEffect(() => {
    fetch('/api/categories', { credentials: 'include' })
      .then(r => {
        if (r.status === 401) { handle401(); return null }
        return r.json()
      })
      .then(d => { if (d?.categorias) setCategorias(d.categorias) })
      .catch(() => {})
  }, [handle401])

  const carregarSugestoes = useCallback(async () => {
    try {
      const res = await fetch('/api/economy', { credentials: 'include' })
      if (res.status === 401) { handle401(); return }
      if (!res.ok) return
      const data = await res.json()
      if (data.sugestoes) setSugestoes(data.sugestoes)
    } catch { }
  }, [handle401])

  useEffect(() => { carregarSugestoes() }, [carregarSugestoes])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ mes: String(mes), ano: String(ano) })
      if (categoriaId) params.set('categoriaId', String(categoriaId))
      const res = await fetch(`/api/dashboard?${params}`, { credentials: 'include' })
      if (res.status === 401) { handle401(); return }
      if (!res.ok) { setCarregando(false); return }
      const data = await res.json()
      if (data?.resumoGastos) setDados(data)
    } catch {
      // silencia erros de rede
    } finally {
      setCarregando(false)
    }
  }, [mes, ano, categoriaId, handle401])

  useEffect(() => { carregar() }, [carregar])

  async function dispensar(id: number) {
    setDispensando(id)
    try {
      const res = await fetch('/api/economy', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.status === 401) { handle401(); return }
      if (res.ok) setSugestoes(prev => prev.filter(s => s.id !== id))
    } finally {
      setDispensando(null)
    }
  }

  function mesAnterior() {
    if (mes === 1) { setMes(12); setAno(a => a - 1) } else setMes(m => m - 1)
  }
  function mesSeguinte() {
    if (mes === 12) { setMes(1); setAno(a => a + 1) } else setMes(m => m + 1)
  }

  if (carregando || !dados) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center text-gray-400 py-20 text-sm">Carregando dashboard...</div>
      </div>
    )
  }

  const { resumoGastos, vencimentosProximos, indicadores, pagamentosRecentes } = dados
  const totalExibido = visaoReal ? resumoGastos.totalCustoReal : resumoGastos.totalNominal

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Visão consolidada das suas assinaturas</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
            <button onClick={mesAnterior} className="text-gray-400 hover:text-gray-700 px-1.5 font-bold">‹</button>
            <span className="text-sm font-medium text-gray-700 w-28 text-center capitalize">
              {nomeMes(mes)} {ano}
            </span>
            <button onClick={mesSeguinte} className="text-gray-400 hover:text-gray-700 px-1.5 font-bold">›</button>
          </div>

          <select
            value={categoriaId}
            onChange={e => setCategoriaId(e.target.value ? Number(e.target.value) : '')}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          <button
            onClick={() => setVisaoReal(v => !v)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition font-medium ${
              visaoReal
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            {visaoReal ? '👤 Seu custo real' : '💰 Valor nominal'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            {visaoReal ? 'Seu custo real/mês' : 'Total nominal/mês'}
          </p>
          <p className="text-2xl font-bold text-indigo-600">{formatBRL(totalExibido)}</p>
          {!visaoReal && resumoGastos.totalCustoReal < resumoGastos.totalNominal && (
            <p className="text-xs text-gray-400 mt-1">
              Seu real: <span className="text-indigo-500 font-medium">{formatBRL(resumoGastos.totalCustoReal)}</span>
            </p>
          )}
        </div>

        <div className={`bg-white rounded-xl border p-5 ${indicadores.quantidadePendentes > 0 ? 'border-yellow-300' : 'border-gray-200'}`}>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pagamentos pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{indicadores.quantidadePendentes}</p>
          {indicadores.quantidadePendentes > 0 && (
            <p className="text-xs text-yellow-600 mt-1">{formatBRL(indicadores.valorPendentes)}</p>
          )}
        </div>

        <div className={`bg-white rounded-xl border p-5 ${indicadores.quantidadeAtrasados > 0 ? 'border-red-300' : 'border-gray-200'}`}>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pagamentos atrasados</p>
          <p className="text-2xl font-bold text-red-600">{indicadores.quantidadeAtrasados}</p>
          {indicadores.quantidadeAtrasados > 0 && (
            <p className="text-xs text-red-600 mt-1">{formatBRL(indicadores.valorAtrasados)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🗓️</span> Vencimentos nos próximos 7 dias
          </h2>
          {vencimentosProximos.length === 0
            ? <p className="text-sm text-gray-400">Nenhum vencimento próximo.</p>
            : <ul className="space-y-3">
                {vencimentosProximos.map(v => (
                  <li key={v.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{v.nomeServico}</p>
                      <p className="text-xs text-gray-400">
                        Dia {v.diaCobranca} ·{' '}
                        {v.diasRestantes < 0
                          ? <span className="text-red-500">venceu ontem</span>
                          : v.diasRestantes === 0
                          ? <span className="text-orange-500">vence hoje</span>
                          : <span className="text-amber-600">em {v.diasRestantes} dia{v.diasRestantes > 1 ? 's' : ''}</span>
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-700">{formatBRL(visaoReal ? v.custoReal : v.valor)}</p>
                    </div>
                  </li>
                ))}
              </ul>
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🕐</span> Últimos pagamentos
          </h2>
          {pagamentosRecentes.length === 0
            ? <p className="text-sm text-gray-400">Nenhum pagamento registrado.</p>
            : <ul className="space-y-3">
                {pagamentosRecentes.map(p => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{p.nomeAssinatura}</p>
                      <p className="text-xs text-gray-400">
                        {formatDataBR(p.dataPagamento)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStatus[p.status] ?? ''}`}>
                        {p.status}
                      </span>
                      <span className="font-semibold text-gray-700">{formatBRL(p.valor)}</span>
                    </div>
                  </li>
                ))}
              </ul>
          }
          <Link href="/payments" className="mt-4 block text-xs text-indigo-500 hover:underline text-right">
            Ver todos os pagamentos →
          </Link>
        </div>
      </div>

      {resumoGastos.totalPorCategoria.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🏷️</span> Gasto por categoria
            <span className="text-xs text-gray-400 font-normal ml-1">
              ({visaoReal ? 'custo real' : 'valor nominal'})
            </span>
          </h2>
          <div className="space-y-3">
            {resumoGastos.totalPorCategoria.map(cat => {
              const valor = visaoReal ? cat.custoReal : cat.nominal
              const pct = totalExibido > 0 ? (valor / totalExibido) * 100 : 0
              return (
                <div key={cat.categoriaId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{cat.nome}</span>
                    <span className="text-gray-600">{formatBRL(valor)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 text-right">{pct.toFixed(1)}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sugestoes.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <h2 className="text-sm font-semibold text-amber-700 mb-4 flex items-center gap-2">
            <span>💡</span> Sugestões de economia
            <span className="ml-auto text-xs font-normal text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
              {sugestoes.length} alerta{sugestoes.length > 1 ? 's' : ''}
            </span>
          </h2>
          <ul className="space-y-3">
            {sugestoes.map(s => (
              <li key={s.id} className="flex items-start justify-between gap-4 bg-amber-50 rounded-lg px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{s.tipo === 'sobreposicao' ? '🔁' : '💤'}</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">
                      {s.tipo === 'sobreposicao' ? 'Sobreposição de serviços' : 'Possível desuso'}
                      {' · '}<span className="font-normal text-amber-700">{s.categoria}</span>
                    </p>
                    <p className="text-xs text-amber-700">{s.descricao}</p>
                  </div>
                </div>
                <button
                  onClick={() => dispensar(s.id)}
                  disabled={dispensando === s.id}
                  className="flex-shrink-0 text-xs text-amber-500 hover:text-amber-700 disabled:opacity-40 border border-amber-200 hover:border-amber-400 rounded-lg px-2.5 py-1 transition"
                  title="Dispensar sugestão"
                >
                  {dispensando === s.id ? '...' : 'Dispensar'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/subscriptions"
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl p-5 transition flex items-center justify-between">
          <div>
            <p className="font-semibold">Assinaturas</p>
            <p className="text-indigo-200 text-xs">Cadastre e gerencie seus serviços</p>
          </div>
          <span className="text-2xl">📋</span>
        </Link>
        <Link href="/payments"
          className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-5 transition flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">Pagamentos</p>
            <p className="text-gray-400 text-xs">Registre e acompanhe cobranças</p>
          </div>
          <span className="text-2xl">💳</span>
        </Link>
        <Link href="/categories"
          className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-5 transition flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">Categorias</p>
            <p className="text-gray-400 text-xs">Organize por tipo de serviço</p>
          </div>
          <span className="text-2xl">🏷️</span>
        </Link>
      </div>
    </div>
  )
}