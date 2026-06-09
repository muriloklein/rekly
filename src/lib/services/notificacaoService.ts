import { prisma } from '../prisma'
import { enviarEmailVencimento, enviarEmailAtraso } from './mailService'

export async function buscarPreferencias(usuarioId: number) {
  const prefs = await prisma.preferenciaNotificacao.findUnique({
    where: { usuario_id: usuarioId },
  })
  // Retorna defaults caso ainda não exista registro
  return prefs ?? {
    id: null,
    usuario_id: usuarioId,
    notificar_vencimento: true,
    notificar_atraso: true,
    dias_antecedencia: 7,
  }
}

export async function salvarPreferencias(
  usuarioId: number,
  dados: { notificar_vencimento: boolean; notificar_atraso: boolean; dias_antecedencia: number }
) {
  const diasValidos = Math.max(1, Math.min(30, dados.dias_antecedencia))
  return prisma.preferenciaNotificacao.upsert({
    where: { usuario_id: usuarioId },
    create: {
      usuario_id: usuarioId,
      notificar_vencimento: dados.notificar_vencimento,
      notificar_atraso: dados.notificar_atraso,
      dias_antecedencia: diasValidos,
    },
    update: {
      notificar_vencimento: dados.notificar_vencimento,
      notificar_atraso: dados.notificar_atraso,
      dias_antecedencia: diasValidos,
    },
  })
}

async function jaEnviado(usuarioId: number, tipo: string, assinaturaId: number, dataHoje: string) {
  const chave = `${tipo}:${assinaturaId}:${dataHoje}`
  const existente = await prisma.notificacao.findFirst({
    where: { usuario_id: usuarioId, tipo, data_ref: chave },
  })
  return existente !== null
}

async function registrarNotificacao(
  usuarioId: number,
  tipo: string,
  mensagem: string,
  assinaturaId: number,
  dataHoje: string
) {
  const chave = `${tipo}:${assinaturaId}:${dataHoje}`
  await prisma.notificacao.create({
    data: {
      usuario_id: usuarioId,
      tipo,
      mensagem,
      data_ref: chave,
    },
  })
}

function proximaCobranca(diaCobranca: number): Date {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()

  // Tenta o dia de cobrança no mês atual
  const diaMaxMesAtual = new Date(ano, mes + 1, 0).getDate()
  const diaEfetivo = Math.min(diaCobranca, diaMaxMesAtual)
  const candidato = new Date(ano, mes, diaEfetivo)

  // Se já passou neste mês, vai pro próximo
  if (candidato <= hoje) {
    const proximoMes = mes + 1
    const diaMaxProximo = new Date(ano, proximoMes + 1, 0).getDate()
    const diaEfetivoProximo = Math.min(diaCobranca, diaMaxProximo)
    return new Date(ano, proximoMes, diaEfetivoProximo)
  }

  return candidato
}

function diffDias(a: Date, b: Date): number {
  const msA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const msB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((msB - msA) / (1000 * 60 * 60 * 24))
}

function dataHojeStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function processarNotificacoes(): Promise<{ enviados: number; erros: number }> {
  const hoje = new Date()
  const hojeStr = dataHojeStr()
  let enviados = 0
  let erros = 0

  // Carrega todos os usuários com preferências e assinaturas ativas
  const usuarios = await prisma.usuario.findMany({
    include: {
      preferenciasNotif: true,
      assinaturas: {
        where: { status: { in: ['ativo', 'teste'] } },
      },
    },
  })

  for (const usuario of usuarios) {
    const prefs = usuario.preferenciasNotif ?? {
      notificar_vencimento: true,
      notificar_atraso: true,
      dias_antecedencia: 7,
    }

    for (const assinatura of usuario.assinaturas) {
      if (prefs.notificar_vencimento) {
        const proxCobranca = proximaCobranca(assinatura.dia_cobranca)
        const diasRestantes = diffDias(hoje, proxCobranca)

        if (diasRestantes >= 0 && diasRestantes <= prefs.dias_antecedencia) {
          const jaDuplicado = await jaEnviado(usuario.id, 'vencimento', assinatura.id, hojeStr)

          if (!jaDuplicado) {
            const mensagem = `Sua assinatura "${assinatura.nome_servico}" vence em ${diasRestantes === 0 ? 'hoje' : `${diasRestantes} dia(s)`} (dia ${assinatura.dia_cobranca}).`
            try {
              await enviarEmailVencimento(
                usuario.email,
                usuario.nome,
                assinatura.nome_servico,
                proxCobranca,
                diasRestantes
              )
              await registrarNotificacao(usuario.id, 'vencimento', mensagem, assinatura.id, hojeStr)
              enviados++
            } catch {
              erros++
            }
          }
        }
      }

      if (prefs.notificar_atraso) {
        const proxCobranca = proximaCobranca(assinatura.dia_cobranca)
        const diasAtraso = diffDias(proxCobranca, hoje)

        // diasAtraso > 0 significa que a cobrança esperada já passou (atrasado)
        // Verifica se há pagamento registrado no mês atual
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)

        const pagamentoMes = await prisma.pagamento.findFirst({
          where: {
            assinatura_id: assinatura.id,
            data_pagamento: { gte: inicioMes, lte: fimMes },
            status: 'pago',
          },
        })

        const diaCobrancaPassou = hoje.getDate() > assinatura.dia_cobranca
        if (diaCobrancaPassou && !pagamentoMes) {
          const jaDuplicado = await jaEnviado(usuario.id, 'atraso', assinatura.id, hojeStr)

          if (!jaDuplicado) {
            const diasAtrasadosReal = hoje.getDate() - assinatura.dia_cobranca
            const mensagem = `Pagamento de "${assinatura.nome_servico}" está em atraso há ${diasAtrasadosReal} dia(s).`
            try {
              await enviarEmailAtraso(
                usuario.email,
                usuario.nome,
                assinatura.nome_servico,
                assinatura.dia_cobranca,
                diasAtrasadosReal
              )
              await registrarNotificacao(usuario.id, 'atraso', mensagem, assinatura.id, hojeStr)
              enviados++
            } catch {
              erros++
            }
          }
        }
      }
    }
  }

  return { enviados, erros }
}
