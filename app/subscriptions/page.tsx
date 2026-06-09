'use client'

import { useState, useEffect, useCallback } from 'react'

interface Categoria { id: number; nome: string }
interface Assinatura {
  id: number; nome_servico: string; valor: number; mensalidade: number
  custoReal: number; moeda: string; periodo: string; dia_cobranca: number
  status: string; participantes: number; categoria: Categoria
}

const PERIODOS = ['mensal', 'trimestral', 'semestral', 'anual']
const STATUS_OPTS = ['ativo', 'teste', 'cancelado']
const MOEDAS = ['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD']

const labelPeriodo: Record<string, string> = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' }
const badgeStatus: Record<string, string> = {
  ativo: 'bg-green-100 text-green-800',
  teste: 'bg-amber-100 text-amber-800',
  cancelado: 'bg-gray-100 text-gray-700',
}

const labelStatus: Record<string, string> = {
  ativo: 'Ativo',
  teste: 'Teste',
  cancelado: 'Cancelado',
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formVazio = {
  nomeServico: '', categoriaId: '', valor: '', moeda: 'BRL',
  periodo: 'mensal', dataInicio: '', diaCobranca: '', status: 'ativo', participantes: '1',
}

function formatStatus(status: string) {
  return labelStatus[status.toLowerCase()] ?? status
}

const fieldClassName =
  'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400'

export default function AssinaturasPage() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [filtroNome, setFiltroNome] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState(formVazio)
  const [detalhe, setDetalhe] = useState<Assinatura | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handle401 = useCallback(() => {
    window.location.href = '/login'
  }, [])

  const carregar = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroNome) params.set('nome', filtroNome)
    if (filtroStatus) params.set('status', filtroStatus)
    const res = await fetch(`/api/subscriptions?${params}`, { credentials: 'include' })
    if (res.status === 401) {
      handle401()
      return
    }
    const data = await res.json()
    if (data.assinaturas) setAssinaturas(data.assinaturas)
  }, [filtroNome, filtroStatus])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => { if (d.categorias) setCategorias(d.categorias) })
  }, [])

  function feedback(msg: string, tipo: 'erro' | 'ok') {
    if (tipo === 'erro') { setErro(msg); setSucesso('') }
    else { setSucesso(msg); setErro('') }
    setTimeout(() => { setErro(''); setSucesso('') }, 3500)
  }

  function abrirCriar() { setForm(formVazio); setEditandoId(null); setModalAberto(true) }

  function abrirEditar(a: Assinatura) {
    setForm({
      nomeServico: a.nome_servico, categoriaId: String(a.categoria.id),
      valor: String(a.valor), moeda: a.moeda, periodo: a.periodo,
      dataInicio: '', diaCobranca: String(a.dia_cobranca),
      status: a.status, participantes: String(a.participantes),
    })
    setEditandoId(a.id)
    setModalAberto(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    const body = {
      nomeServico: form.nomeServico, categoriaId: Number(form.categoriaId),
      valor: Number(form.valor), moeda: form.moeda, periodo: form.periodo,
      dataInicio: form.dataInicio || new Date().toISOString().split('T')[0],
      diaCobranca: Number(form.diaCobranca), status: form.status,
      participantes: Number(form.participantes) || 1,
      ...(editandoId ? { id: editandoId } : {}),
    }

    const res = await fetch('/api/subscriptions', {
      method: editandoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setCarregando(false)
    if (!res.ok) { feedback(data.erro, 'erro'); return }
    setModalAberto(false)
    feedback(editandoId ? 'Assinatura atualizada!' : 'Assinatura criada!', 'ok')
    carregar()
  }

  async function handleCancelar(id: number, nome: string) {
    if (!confirm(`Cancelar a assinatura "${nome}"?`)) return
    const res = await fetch('/api/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancelar', id }),
    })
    const data = await res.json()
    if (!res.ok) { feedback(data.erro, 'erro'); return }
    feedback('Assinatura cancelada.', 'ok'); carregar()
  }

  async function handleExcluir(id: number, nome: string) {
    if (!confirm(`Excluir permanentemente "${nome}"?`)) return
    const res = await fetch(`/api/subscriptions?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { feedback(data.erro, 'erro'); return }
    feedback('Assinatura excluída.', 'ok'); carregar()
  }

  const [modalImport, setModalImport] = useState(false)
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState<{
    importados: number; rejeitados: Array<{ linha: number; motivo: string }>; total: number
  } | null>(null)

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setResultadoImport(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/subscriptions/import', { method: 'POST', body: fd })
    const data = await res.json()
    setImportando(false)
    if (!res.ok) { feedback(data.erro ?? 'Erro ao importar.', 'erro'); return }
    setResultadoImport(data)
    setModalImport(true)
    carregar()
    // Limpa input
    e.target.value = ''
  }

  async function downloadTemplate() {
    const res = await fetch('/api/subscriptions/import')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template_assinaturas.csv'; a.click()
    URL.revokeObjectURL(url)
  }


  const valorNum = Number(form.valor) || 0
  const partNum = Number(form.participantes) || 1
  const divisores: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 }
  const mensalidadePreview = valorNum / (divisores[form.periodo] || 1)
  const custoRealPreview = mensalidadePreview / partNum

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mr-auto">Assinaturas</h1>
        <button
          onClick={downloadTemplate}
          className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition"
        >
          ↓ Template CSV
        </button>
        <label className={`border border-indigo-300 text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${importando ? 'opacity-60 pointer-events-none' : ''}`}>
          {importando ? 'Importando...' : '↑ Importar CSV'}
          <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={importando} />
        </label>
        <button onClick={abrirCriar}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Nova assinatura
        </button>
      </div>

      {erro && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{erro}</div>}
      {sucesso && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{sucesso}</div>}

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input type="text" placeholder="Buscar por nome..." value={filtroNome}
          onChange={e => setFiltroNome(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56" />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">Todos os status</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
        </select>
        {(filtroNome || filtroStatus) &&
          <button onClick={() => { setFiltroNome(''); setFiltroStatus('') }}
            className="text-sm text-gray-500 hover:text-gray-700">Limpar filtros</button>}
      </div>

      {/* Lista */}
      {assinaturas.length === 0
        ? <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500 text-sm">
            Nenhuma assinatura encontrada.
          </div>
        : <div className="space-y-3">
            {assinaturas.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 truncate">{a.nome_servico}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStatus[a.status] ?? ''}`}>
                      {formatStatus(a.status)}
                    </span>
                    {a.participantes > 1 &&
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                        👥 Compartilhado
                      </span>}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{a.categoria.nome} · {labelPeriodo[a.periodo]} · vence dia {a.dia_cobranca}</div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">Valor nominal</span>
                      <p className="font-semibold text-gray-700">{formatBRL(a.mensalidade)}<span className="text-gray-500 font-normal">/mês</span></p>
                    </div>
                    {a.participantes > 1 && (
                      <div>
                        <span className="text-gray-500 text-xs">Seu custo real</span>
                        <p className="font-semibold text-indigo-600">{formatBRL(a.custoReal)}<span className="text-gray-500 font-normal">/mês</span></p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0 text-right">
                  <button onClick={() => setDetalhe(a)} className="text-xs text-indigo-600 hover:underline">Detalhes</button>
                  {a.status !== 'cancelado' && (
                    <button onClick={() => abrirEditar(a)} className="text-xs text-gray-500 hover:underline">Editar</button>
                  )}
                  {a.status !== 'cancelado' && (
                    <button onClick={() => handleCancelar(a.id, a.nome_servico)} className="text-xs text-orange-500 hover:underline">Cancelar</button>
                  )}
                  <button onClick={() => handleExcluir(a.id, a.nome_servico)} className="text-xs text-red-500 hover:underline">Excluir</button>
                </div>
              </div>
            ))}
          </div>}

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editandoId ? 'Editar assinatura' : 'Nova assinatura'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome do serviço *</label>
                <input required value={form.nomeServico} onChange={e => setForm(f => ({ ...f, nomeServico: e.target.value }))}
                  className={fieldClassName}
                  placeholder="Ex: Netflix, Spotify..." />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Categoria *</label>
                <select required value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
                  className={fieldClassName}>
                  <option value="">Selecione...</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Valor *</label>
                  <input required type="number" min="0.01" step="0.01" value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    className={fieldClassName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Moeda</label>
                  <select value={form.moeda} onChange={e => setForm(f => ({ ...f, moeda: e.target.value }))}
                    className={fieldClassName}>
                    {MOEDAS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Período *</label>
                  <select required value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                    className={fieldClassName}>
                    {PERIODOS.map(p => <option key={p} value={p}>{labelPeriodo[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Dia de cobrança *</label>
                  <input required type="number" min="1" max="31" value={form.diaCobranca}
                    onChange={e => setForm(f => ({ ...f, diaCobranca: e.target.value }))}
                    className={fieldClassName} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className={fieldClassName}>
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Participantes</label>
                  <input type="number" min="1" value={form.participantes}
                    onChange={e => setForm(f => ({ ...f, participantes: e.target.value }))}
                    className={fieldClassName} />
                </div>
              </div>

              {!editandoId && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Data de início</label>
                  <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                    className={fieldClassName} />
                </div>
              )}

              {/* Preview custo real */}
              {valorNum > 0 && (
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-sm">
                  <p className="text-indigo-700">
                    Equivalente mensal: <strong>{formatBRL(mensalidadePreview)}</strong>
                    {partNum > 1 && <> · Seu custo real: <strong className="text-indigo-600">{formatBRL(custoRealPreview)}</strong></>}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={carregando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60">
                  {carregando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar assinatura'}
                </button>
                <button type="button" onClick={() => setModalAberto(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-800">{detalhe.nome_servico}</h2>
              <button onClick={() => setDetalhe(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                ['Categoria', detalhe.categoria.nome],
                ['Status', formatStatus(detalhe.status)],
                ['Período', labelPeriodo[detalhe.periodo]],
                ['Moeda', detalhe.moeda],
                ['Valor cobrado', formatBRL(detalhe.valor)],
                ['Equivalente mensal', formatBRL(detalhe.mensalidade)],
                ['Participantes', String(detalhe.participantes)],
                ...(detalhe.participantes > 1 ? [['Seu custo real/mês', formatBRL(detalhe.custoReal)]] : []),
                ['Dia de cobrança', String(detalhe.dia_cobranca)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-800">{v}</dd>
                </div>
              ))}
            </dl>
            <button onClick={() => setDetalhe(null)}
              className="mt-5 w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal resultado importação CSV */}
      {modalImport && resultadoImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Resultado da importação</h2>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{resultadoImport.importados}</p>
                <p className="text-xs text-green-700">Importados</p>
              </div>
              <div className="flex-1 rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{resultadoImport.rejeitados.length}</p>
                <p className="text-xs text-red-600">Rejeitados</p>
              </div>
              <div className="flex-1 rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
                <p className="text-2xl font-bold text-gray-600">{resultadoImport.total}</p>
                <p className="text-xs text-gray-500">Total no CSV</p>
              </div>
            </div>
            {resultadoImport.rejeitados.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Registros rejeitados:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {resultadoImport.rejeitados.map((r, i) => (
                    <div key={i} className="rounded bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                      <span className="font-semibold">Linha {r.linha}:</span> {r.motivo}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => { setModalImport(false); setResultadoImport(null) }}
              className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
