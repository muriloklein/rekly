'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Assinatura {
  id: number
  nome_servico: string
  status: string
}

interface Pagamento {
  id: number
  valor: number
  data_pagamento: string
  status: string
  assinatura: Assinatura & { categoria: { nome: string } }
}

const STATUS_OPTS = ['pago', 'pendente', 'atrasado']
const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const badgeStatus: Record<string, string> = {
  pago: 'bg-green-100 text-green-800',
  pendente: 'bg-amber-100 text-amber-800',
  atrasado: 'bg-red-100 text-red-800',
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatData(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function formatarDataBR(iso: string) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

const anoAtual = new Date().getFullYear()
const mesAtual = new Date().getMonth() + 1

const formVazio = {
  assinaturaId: '',
  valor: '',
  dataPagamento: new Date().toISOString().split('T')[0],
  status: 'pago',
}

export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const dataPagamentoRef = useRef<HTMLInputElement | null>(null)

  // Filtros
  const [filtroAssinatura, setFiltroAssinatura] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroMes, setFiltroMes] = useState(String(mesAtual))
  const [filtroAno, setFiltroAno] = useState(String(anoAtual))

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState(formVazio)

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handle401 = useCallback(() => {
    window.location.href = '/login'
  }, [])

  const carregar = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroAssinatura) params.set('assinaturaId', filtroAssinatura)
    if (filtroStatus) params.set('status', filtroStatus)
    if (filtroMes) params.set('mes', filtroMes)
    if (filtroAno) params.set('ano', filtroAno)
    const res = await fetch(`/api/payments?${params}`, {
      credentials: 'include',
    })

    if (res.status === 401) {
      handle401()
      return
    }

    const data = await res.json()
    if (data.pagamentos) setPagamentos(data.pagamentos)
  }, [filtroAssinatura, filtroStatus, filtroMes, filtroAno])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    fetch('/api/subscriptions')
      .then(r => r.json())
      .then(d => { if (d.assinaturas) setAssinaturas(d.assinaturas) })
  }, [])

  function feedback(msg: string, tipo: 'erro' | 'ok') {
    if (tipo === 'erro') { setErro(msg); setSucesso('') }
    else { setSucesso(msg); setErro('') }
    setTimeout(() => { setErro(''); setSucesso('') }, 3500)
  }

  function abrirCriar() {
    setForm(formVazio)
    setEditandoId(null)
    setModalAberto(true)
  }

  function abrirCalendarioData() {
    const input = dataPagamentoRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') input.showPicker()
    else input.click()
  }

  function abrirEditar(p: Pagamento) {
    setForm({
      assinaturaId: String(p.assinatura.id),
      valor: String(p.valor),
      dataPagamento: p.data_pagamento.split('T')[0],
      status: p.status,
    })
    setEditandoId(p.id)
    setModalAberto(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)

    const body = {
      assinaturaId: Number(form.assinaturaId),
      valor: Number(form.valor),
      dataPagamento: form.dataPagamento,
      status: form.status,
      ...(editandoId ? { id: editandoId } : {}),
    }

    const res = await fetch('/api/payments', {
      method: editandoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setCarregando(false)
    if (!res.ok) { feedback(data.erro, 'erro'); return }
    setModalAberto(false)
    feedback(editandoId ? 'Pagamento atualizado!' : 'Pagamento registrado!', 'ok')
    carregar()
  }

  async function handleExcluir(id: number) {
    if (!confirm('Excluir este registro de pagamento?')) return
    const res = await fetch(`/api/payments?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { feedback(data.erro, 'erro'); return }
    feedback('Pagamento excluído.', 'ok')
    carregar()
  }

  function limparFiltros() {
    setFiltroAssinatura('')
    setFiltroStatus('')
    setFiltroMes(String(mesAtual))
    setFiltroAno(String(anoAtual))
  }

  const assinaturasAtivas = assinaturas.filter(a => a.status !== 'cancelado')

  // Totais do período exibido
  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor), 0)
  const totalPendente = pagamentos.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor), 0)
  const totalAtrasado = pagamentos.filter(p => p.status === 'atrasado').reduce((s, p) => s + Number(p.valor), 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pagamentos</h1>
        <button
          onClick={abrirCriar}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Registrar pagamento
        </button>
      </div>

      {erro && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{erro}</div>}
      {sucesso && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{sucesso}</div>}

      {/* Cards de totais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total pago', valor: totalPago, cor: 'text-green-600' },
          { label: 'Total pendente', valor: totalPendente, cor: 'text-yellow-600' },
          { label: 'Total atrasado', valor: totalAtrasado, cor: 'text-red-600' },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${cor}`}>{formatBRL(valor)}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-700">Filtros</span>
          {(filtroAssinatura || filtroStatus || filtroMes !== String(mesAtual) || filtroAno !== String(anoAtual)) && (
            <button onClick={limparFiltros} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">
              Limpar filtros
            </button>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={filtroAssinatura}
            onChange={e => setFiltroAssinatura(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todas as assinaturas</option>
            {assinaturas.map(a => <option key={a.id} value={a.id}>{a.nome_servico}</option>)}
          </select>

          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>

          <select
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todos os meses</option>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>

          <select
            value={filtroAno}
            onChange={e => setFiltroAno(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {[anoAtual - 1, anoAtual, anoAtual + 1].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <button
            onClick={() => carregar()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Lista de pagamentos */}
      {pagamentos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500 text-sm">
          Nenhum pagamento encontrado.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-600 text-xs uppercase">
                <th className="text-left px-5 py-3">Assinatura</th>
                <th className="text-left px-5 py-3">Categoria</th>
                <th className="text-left px-5 py-3">Data</th>
                <th className="text-right px-5 py-3">Valor</th>
                <th className="text-center px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagamentos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-800">{p.assinatura.nome_servico}</td>
                  <td className="px-5 py-3 text-gray-500">{p.assinatura.categoria.nome}</td>
                  <td className="px-5 py-3 text-gray-500">{formatData(p.data_pagamento)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">{formatBRL(Number(p.valor))}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStatus[p.status] ?? ''}`}>
                      {p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : ''}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => abrirEditar(p)}
                      className="text-xs text-indigo-600 hover:underline mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleExcluir(p.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editandoId ? 'Editar pagamento' : 'Registrar pagamento'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Assinatura *</label>
                <select
                  required
                  value={form.assinaturaId}
                  onChange={e => setForm(f => ({ ...f, assinaturaId: e.target.value }))}
                  disabled={!!editandoId}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Selecione...</option>
                  {assinaturasAtivas.map(a => (
                    <option key={a.id} value={a.id}>{a.nome_servico}</option>
                  ))}
                </select>
                {!editandoId && (
                  <p className="text-xs text-gray-500 mt-1">Apenas assinaturas ativas ou em teste.</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Valor pago (R$) *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Data do pagamento *</label>
                <div className="mt-1 relative">
                  <input
                    readOnly
                    type="text"
                    value={formatarDataBR(form.dataPagamento)}
                    onClick={abrirCalendarioData}
                    placeholder="dd/mm/aaaa"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-11 text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={abrirCalendarioData}
                    className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-gray-700"
                    aria-label="Abrir calendário"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <input
                    ref={dataPagamentoRef}
                    required
                    type="date"
                    lang="pt-BR"
                    value={form.dataPagamento}
                    onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {STATUS_OPTS.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={carregando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
                >
                  {carregando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Registrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
