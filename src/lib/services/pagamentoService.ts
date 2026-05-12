import * as repo from '../repositories/pagamentoRepository'
import * as assinaturaRepo from '../repositories/assinaturaRepository'
import { registrarLog } from '../repositories/usuarioRepository'

const STATUS_VALIDOS = ['pago', 'pendente', 'atrasado']

function validarStatus(status: string) {
  return STATUS_VALIDOS.includes(status)
}

export async function listar(
  usuarioId: number,
  filtros?: { assinaturaId?: number; status?: string; mes?: number; ano?: number }
) {
  return repo.findAllByUsuario(usuarioId, filtros)
}

export async function buscarPorAssinatura(assinaturaId: number, usuarioId: number) {
  // Verifica se a assinatura pertence ao usuário
  const assinatura = await assinaturaRepo.findById(assinaturaId, usuarioId)
  if (!assinatura) return { erro: 'Assinatura não encontrada.' }
  const pagamentos = await repo.findByAssinatura(assinaturaId, usuarioId)
  return { pagamentos }
}

export async function registrar(
  usuarioId: number,
  body: Record<string, unknown>
) {
  const { assinaturaId, valor, dataPagamento, status } = body

  if (!assinaturaId || valor === undefined || !dataPagamento) {
    return { erro: 'Campos obrigatórios: assinaturaId, valor e dataPagamento.' }
  }

  if (Number(valor) <= 0) return { erro: 'O valor deve ser maior que zero.' }

  const statusFinal = status ? String(status) : 'pago'
  if (!validarStatus(statusFinal)) return { erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.` }

  // Verifica se assinatura pertence ao usuário e não está cancelada
  const assinatura = await assinaturaRepo.findById(Number(assinaturaId), usuarioId)
  if (!assinatura) return { erro: 'Assinatura não encontrada.' }
  if (assinatura.status === 'cancelado') {
    return { erro: 'Não é possível registrar pagamentos para assinaturas canceladas.' }
  }

  const data = new Date(String(dataPagamento))
  if (isNaN(data.getTime())) return { erro: 'Data de pagamento inválida.' }

  const pagamento = await repo.create({
    assinaturaId: Number(assinaturaId),
    valor: Number(valor),
    dataPagamento: data,
    status: statusFinal,
  })

  await registrarLog(usuarioId, 'REGISTRAR_PAGAMENTO', 'pagamentos', pagamento.id)
  return { pagamento }
}

export async function editar(
  id: number,
  usuarioId: number,
  body: Record<string, unknown>
) {
  const existente = await repo.findById(id, usuarioId)
  if (!existente) return { erro: 'Pagamento não encontrado.' }

  const dados: Parameters<typeof repo.update>[1] = {}

  if (body.valor !== undefined) {
    if (Number(body.valor) <= 0) return { erro: 'O valor deve ser maior que zero.' }
    dados.valor = Number(body.valor)
  }
  if (body.dataPagamento !== undefined) {
    const data = new Date(String(body.dataPagamento))
    if (isNaN(data.getTime())) return { erro: 'Data inválida.' }
    dados.dataPagamento = data
  }
  if (body.status !== undefined) {
    if (!validarStatus(String(body.status))) return { erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.` }
    dados.status = String(body.status)
  }

  const pagamento = await repo.update(id, dados)
  await registrarLog(usuarioId, 'EDITAR_PAGAMENTO', 'pagamentos', id)
  return { pagamento }
}

export async function excluir(id: number, usuarioId: number) {
  const existente = await repo.findById(id, usuarioId)
  if (!existente) return { erro: 'Pagamento não encontrado.' }

  await repo.remove(id)
  await registrarLog(usuarioId, 'EXCLUIR_PAGAMENTO', 'pagamentos', id)
  return { ok: true }
}

export async function recentes(usuarioId: number, limite = 5) {
  return repo.findRecentes(usuarioId, limite)
}
