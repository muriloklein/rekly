import { prisma } from '../prisma'
import { calcularMensalidade, calcularCustoReal } from './assinaturaService'

export interface ResumoGastos {
  totalNominal: number
  totalCustoReal: number
  totalPorCategoria: { categoriaId: number; nome: string; nominal: number; custoReal: number }[]
}

export interface VencimentoProximo {
  id: number
  nomeServico: string
  valor: number
  custoReal: number
  diaCobranca: number
  diasRestantes: number
}

export interface IndicadorPendente {
  quantidadePendentes: number
  quantidadeAtrasados: number
  valorPendentes: number
  valorAtrasados: number
}

export interface PagamentoRecente {
  id: number
  nomeAssinatura: string
  valor: number
  dataPagamento: string
  status: string
}

export interface DadosDashboard {
  resumoGastos: ResumoGastos
  vencimentosProximos: VencimentoProximo[]
  indicadores: IndicadorPendente
  pagamentosRecentes: PagamentoRecente[]
  mesAtual: number
  anoAtual: number
}

export async function obterDadosDashboard(
  usuarioId: number,
  mes: number,
  ano: number,
  categoriaId?: number
): Promise<DadosDashboard> {
  const [resumoGastos, vencimentosProximos, indicadores, pagamentosRecentes] = await Promise.all([
    calcularResumoGastos(usuarioId, mes, ano, categoriaId),
    buscarVencimentosProximos(usuarioId),
    calcularIndicadoresPendentes(usuarioId, mes, ano),
    buscarPagamentosRecentes(usuarioId),
  ])

  return {
    resumoGastos,
    vencimentosProximos,
    indicadores,
    pagamentosRecentes,
    mesAtual: mes,
    anoAtual: ano,
  }
}

async function calcularResumoGastos(
  usuarioId: number,
  mes: number,
  ano: number,
  categoriaId?: number
): Promise<ResumoGastos> {
  // Último dia do mês consultado — assinaturas iniciadas após isso não existiam naquele mês
  const ultimoDiaDoMes = new Date(ano, mes, 0, 23, 59, 59, 999)

  const assinaturas = await prisma.assinatura.findMany({
    where: {
      usuario_id: usuarioId,
      // Considera ativo OU cancelado: cancelado ainda pode ter existido no mês consultado.
      // Filtramos por data_inicio para garantir que a assinatura já existia naquele mês.
      status: { in: ['ativo', 'cancelado'] },
      data_inicio: { lte: ultimoDiaDoMes },
      ...(categoriaId ? { categoria_id: categoriaId } : {}),
    },
    include: { categoria: true },
  })

  // Para meses passados, inclui canceladas que existiam no período.
  // Para o mês atual, exclui canceladas (já não estão ativas).
  const hoje = new Date()
  const mesMostradoEhAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()
  const mesMostradoEhFuturo = new Date(ano, mes - 1, 1) > hoje

  const assinaturasFiltradas = assinaturas.filter(a => {
    if (a.status === 'ativo') return true
    // Cancelada: só inclui se o mês consultado for passado
    if (mesMostradoEhAtual || mesMostradoEhFuturo) return false
    return true
  })

  let totalNominal = 0
  let totalCustoReal = 0

  const mapa = new Map<number, { nome: string; nominal: number; custoReal: number }>()

  for (const a of assinaturasFiltradas) {
    const valor = Number(a.valor)
    const mensalidade = calcularMensalidade(valor, a.periodo)
    const custoReal = calcularCustoReal(valor, a.periodo, a.participantes)

    totalNominal += mensalidade
    totalCustoReal += custoReal

    const catId = a.categoria_id
    const catNome = a.categoria.nome
    const atual = mapa.get(catId) ?? { nome: catNome, nominal: 0, custoReal: 0 }
    mapa.set(catId, {
      nome: catNome,
      nominal: atual.nominal + mensalidade,
      custoReal: atual.custoReal + custoReal,
    })
  }

  const totalPorCategoria = Array.from(mapa.entries()).map(([categoriaId, dados]) => ({
    categoriaId,
    nome: dados.nome,
    nominal: dados.nominal,
    custoReal: dados.custoReal,
  }))

  return { totalNominal, totalCustoReal, totalPorCategoria }
}

async function buscarVencimentosProximos(usuarioId: number): Promise<VencimentoProximo[]> {
  const assinaturas = await prisma.assinatura.findMany({
    where: { usuario_id: usuarioId, status: 'ativo' },
    include: { categoria: true },
  })

  const hoje = new Date()
  const diaHoje = hoje.getDate()
  const resultado: VencimentoProximo[] = []

  for (const a of assinaturas) {
    const diasRestantes = a.dia_cobranca - diaHoje

    if (diasRestantes >= -1 && diasRestantes <= 7) {
      const valor = Number(a.valor)
      resultado.push({
        id: a.id,
        nomeServico: a.nome_servico,
        valor: calcularMensalidade(valor, a.periodo),
        custoReal: calcularCustoReal(valor, a.periodo, a.participantes),
        diaCobranca: a.dia_cobranca,
        diasRestantes,
      })
    }
  }

  resultado.sort((a, b) => a.diasRestantes - b.diasRestantes)
  return resultado
}

async function calcularIndicadoresPendentes(
  usuarioId: number,
  mes: number,
  ano: number
): Promise<IndicadorPendente> {
  const pagamentos = await prisma.pagamento.findMany({
    where: {
      assinatura: { usuario_id: usuarioId },
      data_pagamento: {
        gte: new Date(ano, mes - 1, 1),
        lt: new Date(ano, mes, 1),
      },
      status: { in: ['pendente', 'atrasado'] },
    },
  })

  const pendentes = pagamentos.filter(p => p.status === 'pendente')
  const atrasados = pagamentos.filter(p => p.status === 'atrasado')

  return {
    quantidadePendentes: pendentes.length,
    quantidadeAtrasados: atrasados.length,
    valorPendentes: pendentes.reduce((s, p) => s + Number(p.valor), 0),
    valorAtrasados: atrasados.reduce((s, p) => s + Number(p.valor), 0),
  }
}

async function buscarPagamentosRecentes(usuarioId: number): Promise<PagamentoRecente[]> {
  const pagamentos = await prisma.pagamento.findMany({
    where: { assinatura: { usuario_id: usuarioId } },
    include: { assinatura: true },
    orderBy: { data_pagamento: 'desc' },
    take: 5,
  })

  return pagamentos.map(p => ({
    id: p.id,
    nomeAssinatura: p.assinatura.nome_servico,
    valor: Number(p.valor),
    dataPagamento: p.data_pagamento.toISOString(),
    status: p.status,
  }))
}