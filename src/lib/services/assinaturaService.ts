import * as repo from '../repositories/assinaturaRepository'
import { registrarLog } from '../repositories/usuarioRepository'
import { recalcularSugestoes } from './economyService'

const PERIODOS_VALIDOS = ['mensal', 'trimestral', 'semestral', 'anual']
const STATUS_VALIDOS = ['ativo', 'teste', 'cancelado']

// Calcula equivalente mensal com base no período
export function calcularMensalidade(valor: number, periodo: string): number {
  const divisores: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 }
  return valor / (divisores[periodo] ?? 1)
}

// Calcula custo real individual (rateio)
export function calcularCustoReal(valor: number, periodo: string, participantes: number): number {
  return calcularMensalidade(valor, periodo) / (participantes > 0 ? participantes : 1)
}

function validar(body: Record<string, unknown>) {
  const { nomeServico, categoriaId, valor, moeda, periodo, dataInicio, diaCobranca } = body
  if (!nomeServico || !categoriaId || valor === undefined || !moeda || !periodo || !dataInicio || !diaCobranca)
    return 'Todos os campos obrigatórios devem ser preenchidos.'
  if (!PERIODOS_VALIDOS.includes(periodo as string))
    return `Período inválido. Use: ${PERIODOS_VALIDOS.join(', ')}.`
  if (Number(valor) <= 0) return 'O valor deve ser maior que zero.'
  if (Number(diaCobranca) < 1 || Number(diaCobranca) > 31) return 'Dia de cobrança deve ser entre 1 e 31.'
  return null
}

export async function listar(usuarioId: number, filtros?: { nome?: string; categoriaId?: number; status?: string }) {
  const assinaturas = await repo.findAllByUsuario(usuarioId, filtros)
  return assinaturas.map(enriquecer)
}

export async function buscarPorId(id: number, usuarioId: number) {
  const a = await repo.findById(id, usuarioId)
  if (!a) return null
  return enriquecer(a)
}

export async function criar(usuarioId: number, body: Record<string, unknown>) {
  const erro = validar(body)
  if (erro) return { erro }

  const participantes = Number(body.participantes) || 1
  const status = STATUS_VALIDOS.includes(body.status as string) ? (body.status as string) : 'ativo'

  const assinatura = await repo.create({
    usuarioId,
    categoriaId: Number(body.categoriaId),
    nomeServico: String(body.nomeServico).trim(),
    valor: Number(body.valor),
    moeda: String(body.moeda).trim(),
    periodo: String(body.periodo),
    dataInicio: new Date(String(body.dataInicio)),
    diaCobranca: Number(body.diaCobranca),
    status,
    participantes,
  })

  await registrarLog(usuarioId, 'CRIAR_ASSINATURA', 'assinaturas', assinatura.id)
  await recalcularSugestoes(usuarioId)
  return { assinatura: enriquecer(assinatura) }
}

export async function editar(id: number, usuarioId: number, body: Record<string, unknown>) {
  const existente = await repo.findById(id, usuarioId)
  if (!existente) return { erro: 'Assinatura não encontrada.' }

  const dados: Parameters<typeof repo.update>[1] = {}
  if (body.categoriaId !== undefined) dados.categoriaId = Number(body.categoriaId)
  if (body.nomeServico !== undefined) dados.nomeServico = String(body.nomeServico).trim()
  if (body.valor !== undefined) dados.valor = Number(body.valor)
  if (body.moeda !== undefined) dados.moeda = String(body.moeda).trim()
  if (body.periodo !== undefined) {
    if (!PERIODOS_VALIDOS.includes(String(body.periodo))) return { erro: 'Período inválido.' }
    dados.periodo = String(body.periodo)
  }
  if (body.dataInicio !== undefined) dados.dataInicio = new Date(String(body.dataInicio))
  if (body.diaCobranca !== undefined) dados.diaCobranca = Number(body.diaCobranca)
  if (body.status !== undefined) {
    if (!STATUS_VALIDOS.includes(String(body.status))) return { erro: 'Status inválido.' }
    dados.status = String(body.status)
  }
  if (body.participantes !== undefined) dados.participantes = Math.max(1, Number(body.participantes))

  const assinatura = await repo.update(id, dados)
  await registrarLog(usuarioId, 'EDITAR_ASSINATURA', 'assinaturas', id)
  await recalcularSugestoes(usuarioId)
  return { assinatura: enriquecer(assinatura) }
}

export async function cancelar(id: number, usuarioId: number) {
  const existente = await repo.findById(id, usuarioId)
  if (!existente) return { erro: 'Assinatura não encontrada.' }
  if (existente.status === 'cancelado') return { erro: 'Assinatura já está cancelada.' }

  const assinatura = await repo.update(id, { status: 'cancelado' })
  await registrarLog(usuarioId, 'CANCELAR_ASSINATURA', 'assinaturas', id)
  await recalcularSugestoes(usuarioId)
  return { assinatura: enriquecer(assinatura) }
}

export async function excluir(id: number, usuarioId: number) {
  const existente = await repo.findById(id, usuarioId)
  if (!existente) return { erro: 'Assinatura não encontrada.' }

  const temPagamentos = await repo.hasPagamentos(id)
  if (temPagamentos) return { erro: 'Não é possível excluir: assinatura possui pagamentos vinculados.' }

  await repo.remove(id)
  await registrarLog(usuarioId, 'EXCLUIR_ASSINATURA', 'assinaturas', id)
  await recalcularSugestoes(usuarioId)
  return { ok: true }
}

// Enriquece assinatura com campos calculados
function enriquecer(a: Record<string, unknown> & { valor: unknown; periodo: unknown; participantes: unknown }) {
  const valor = Number(a.valor)
  const periodo = String(a.periodo)
  const participantes = Number(a.participantes) || 1
  const mensalidade = calcularMensalidade(valor, periodo)
  const custoReal = calcularCustoReal(valor, periodo, participantes)
  return { ...a, valor, mensalidade, custoReal, participantes }
}