import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/src/lib/auth'
import * as svc from '@/src/lib/services/assinaturaService'

async function auth() {
  const sessao = await getSessao()
  if (!sessao) return null
  return sessao
}

// GET /api/subscriptions?nome=X&categoriaId=Y&status=Z
export async function GET(req: NextRequest) {
  const sessao = await auth()
  if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const filtros = {
    nome: searchParams.get('nome') ?? undefined,
    categoriaId: searchParams.get('categoriaId') ? Number(searchParams.get('categoriaId')) : undefined,
    status: searchParams.get('status') ?? undefined,
  }

  const assinaturas = await svc.listar(sessao.id, filtros)
  return NextResponse.json({ assinaturas })
}

// POST /api/subscriptions — criar assinatura
export async function POST(req: NextRequest) {
  const sessao = await auth()
  if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // action: 'cancelar' para cancelamento via POST
  if (body.action === 'cancelar') {
    if (!body.id) return NextResponse.json({ erro: 'ID é obrigatório.' }, { status: 400 })
    const resultado = await svc.cancelar(Number(body.id), sessao.id)
    if (resultado.erro) return NextResponse.json({ erro: resultado.erro }, { status: 400 })
    return NextResponse.json({ assinatura: resultado.assinatura })
  }

  const resultado = await svc.criar(sessao.id, body)
  if (resultado.erro) return NextResponse.json({ erro: resultado.erro }, { status: 400 })
  return NextResponse.json({ assinatura: resultado.assinatura }, { status: 201 })
}

// PUT /api/subscriptions — editar assinatura
export async function PUT(req: NextRequest) {
  const sessao = await auth()
  if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ erro: 'ID é obrigatório.' }, { status: 400 })

  const resultado = await svc.editar(Number(body.id), sessao.id, body)
  if (resultado.erro) return NextResponse.json({ erro: resultado.erro }, { status: 400 })
  return NextResponse.json({ assinatura: resultado.assinatura })
}

// DELETE /api/subscriptions?id=X — excluir assinatura
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await auth()
    if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

    const id = Number(req.nextUrl.searchParams.get('id'))
    if (!id) return NextResponse.json({ erro: 'ID é obrigatório.' }, { status: 400 })

    const resultado = await svc.excluir(id, sessao.id)
    if (resultado.erro) return NextResponse.json({ erro: resultado.erro }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ erro: 'Falha ao excluir a assinatura.' }, { status: 500 })
  }
}
