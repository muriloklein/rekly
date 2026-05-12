import { prisma } from '../prisma'

export type StatusPagamento = 'pago' | 'pendente' | 'atrasado'

export async function findAllByUsuario(
  usuarioId: number,
  filtros?: { assinaturaId?: number; status?: string; mes?: number; ano?: number }
) {
  return prisma.pagamento.findMany({
    where: {
      assinatura: { usuario_id: usuarioId },
      ...(filtros?.assinaturaId ? { assinatura_id: filtros.assinaturaId } : {}),
      ...(filtros?.status ? { status: filtros.status } : {}),
      ...(filtros?.mes && filtros?.ano
        ? {
            data_pagamento: {
              gte: new Date(filtros.ano, filtros.mes - 1, 1),
              lt: new Date(filtros.ano, filtros.mes, 1),
            },
          }
        : {}),
    },
    include: { assinatura: { include: { categoria: true } } },
    orderBy: { data_pagamento: 'desc' },
  })
}

export async function findById(id: number, usuarioId: number) {
  return prisma.pagamento.findFirst({
    where: { id, assinatura: { usuario_id: usuarioId } },
    include: { assinatura: { include: { categoria: true } } },
  })
}

export async function findByAssinatura(assinaturaId: number, usuarioId: number) {
  return prisma.pagamento.findMany({
    where: { assinatura_id: assinaturaId, assinatura: { usuario_id: usuarioId } },
    orderBy: { data_pagamento: 'desc' },
  })
}

export async function create(data: {
  assinaturaId: number
  valor: number
  dataPagamento: Date
  status: string
}) {
  return prisma.pagamento.create({
    data: {
      assinatura_id: data.assinaturaId,
      valor: data.valor,
      data_pagamento: data.dataPagamento,
      status: data.status,
    },
    include: { assinatura: { include: { categoria: true } } },
  })
}

export async function update(
  id: number,
  data: Partial<{ valor: number; dataPagamento: Date; status: string }>
) {
  return prisma.pagamento.update({
    where: { id },
    data: {
      ...(data.valor !== undefined && { valor: data.valor }),
      ...(data.dataPagamento !== undefined && { data_pagamento: data.dataPagamento }),
      ...(data.status !== undefined && { status: data.status }),
    },
    include: { assinatura: { include: { categoria: true } } },
  })
}

export async function remove(id: number) {
  return prisma.pagamento.delete({ where: { id } })
}

// Verifica se já existe pagamento para essa assinatura no mesmo dia (evitar duplicatas)
export async function findDuplicata(assinaturaId: number, dataPagamento: Date) {
  const inicio = new Date(dataPagamento)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(dataPagamento)
  fim.setHours(23, 59, 59, 999)
  return prisma.pagamento.findFirst({
    where: {
      assinatura_id: assinaturaId,
      data_pagamento: { gte: inicio, lte: fim },
    },
  })
}

// Retorna últimos N pagamentos do usuário (para dashboard)
export async function findRecentes(usuarioId: number, limite = 5) {
  return prisma.pagamento.findMany({
    where: { assinatura: { usuario_id: usuarioId } },
    include: { assinatura: true },
    orderBy: { data_pagamento: 'desc' },
    take: limite,
  })
}
