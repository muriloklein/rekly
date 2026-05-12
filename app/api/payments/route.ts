import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/src/lib/auth'
import * as svc from '@/src/lib/services/pagamentoService'

async function auth() {
  const sessao = await getSessao()
  if (!sessao) return null
  return sessao
}

// GET /api/payments?assinaturaId=X&status=Y&mes=M&ano=A
export async function GET(req: NextRequest) {
  const sessao = await auth()
  if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const assinaturaId = searchParams.get('assinaturaId')
  const status = searchParams.get('status')
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')

  const filtros = {
    assinaturaId: assinaturaId ? Number(assinaturaId) : undefined,
    status: status ?? undefined,
    mes: mes ? Number(mes) : undefined,
    ano: ano ? Number(ano) : undefined,
  }

  const pagamentos = await svc.listar(sessao.id, filtros)
  return NextResponse.json({ pagamentos })
}

// POST /api/payments — registrar pagamento
export async function POST(req: NextRequest) {
  const sessao = await auth()
  if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const resultado = await svc.registrar(sessao.id, body)

  if (resultado.erro) return NextResponse.json({ erro: resultado.erro }, { status: 400 })
  return NextResponse.json({ pagamento: resultado.pagamento }, { status: 201 })
}

// PUT /api/payments — editar pagamento
export async function PUT(req: NextRequest) {
  const sessao = await auth()
  if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ erro: 'ID é obrigatório.' }, { status: 400 })

  const resultado = await svc.editar(Number(body.id), sessao.id, body)
  if (resultado.erro) return NextResponse.json({ erro: resultado.erro }, { status: 400 })
  return NextResponse.json({ pagamento: resultado.pagamento })
}

// DELETE /api/payments?id=X — excluir pagamento
export async function DELETE(req: NextRequest) {
  const sessao = await auth()
  if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ erro: 'ID é obrigatório.' }, { status: 400 })

  const resultado = await svc.excluir(id, sessao.id)
  if (resultado.erro) return NextResponse.json({ erro: resultado.erro }, { status: 400 })
  return NextResponse.json({ ok: true })
}
