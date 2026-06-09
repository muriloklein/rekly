import { prisma } from '../prisma'

export async function findAllByUsuario(usuarioId: number, filtros?: { nome?: string; categoriaId?: number; status?: string }) {
  return prisma.assinatura.findMany({
    where: {
      usuario_id: usuarioId,
      ...(filtros?.status ? { status: filtros.status } : {}),
      ...(filtros?.categoriaId ? { categoria_id: filtros.categoriaId } : {}),
      ...(filtros?.nome ? { nome_servico: { contains: filtros.nome, mode: 'insensitive' } } : {}),
    },
    include: { categoria: true },
    orderBy: { criado_em: 'desc' },
  })
}

export async function findById(id: number, usuarioId: number) {
  return prisma.assinatura.findFirst({
    where: { id, usuario_id: usuarioId },
    include: { categoria: true, pagamentos: { orderBy: { data_pagamento: 'desc' } } },
  })
}

export async function create(data: {
  usuarioId: number; categoriaId: number; nomeServico: string
  valor: number; moeda: string; periodo: string; dataInicio: Date
  diaCobranca: number; status: string; participantes: number
}) {
  return prisma.assinatura.create({
    data: {
      usuario_id: data.usuarioId,
      categoria_id: data.categoriaId,
      nome_servico: data.nomeServico,
      valor: data.valor,
      moeda: data.moeda,
      periodo: data.periodo,
      data_inicio: data.dataInicio,
      dia_cobranca: data.diaCobranca,
      status: data.status,
      participantes: data.participantes,
    },
    include: { categoria: true },
  })
}

export async function update(id: number, data: Partial<{
  categoriaId: number; nomeServico: string; valor: number; moeda: string
  periodo: string; dataInicio: Date; diaCobranca: number; status: string; participantes: number
}>) {
  return prisma.assinatura.update({
    where: { id },
    data: {
      ...(data.categoriaId !== undefined && { categoria_id: data.categoriaId }),
      ...(data.nomeServico !== undefined && { nome_servico: data.nomeServico }),
      ...(data.valor !== undefined && { valor: data.valor }),
      ...(data.moeda !== undefined && { moeda: data.moeda }),
      ...(data.periodo !== undefined && { periodo: data.periodo }),
      ...(data.dataInicio !== undefined && { data_inicio: data.dataInicio }),
      ...(data.diaCobranca !== undefined && { dia_cobranca: data.diaCobranca }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.participantes !== undefined && { participantes: data.participantes }),
    },
    include: { categoria: true },
  })
}

export async function remove(id: number) {
  return prisma.$transaction(async (tx) => {
    await tx.sugestaoEconomia.deleteMany({ where: { assinatura_id: id } })
    return tx.assinatura.delete({ where: { id } })
  })
}

export async function hasPagamentos(id: number) {
  const count = await prisma.pagamento.count({ where: { assinatura_id: id } })
  return count > 0
}
