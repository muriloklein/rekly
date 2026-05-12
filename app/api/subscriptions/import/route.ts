import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/src/lib/auth'
import * as svc from '@/src/lib/services/assinaturaService'
import * as categoriaRepo from '@/src/lib/repositories/categoriaRepository'

const PERIODOS_VALIDOS = ['mensal', 'trimestral', 'semestral', 'anual']
const COLUNAS_OBRIGATORIAS = ['nome_servico', 'categoria', 'valor', 'moeda', 'periodo', 'data_inicio', 'dia_cobranca']

// GET /api/subscriptions/import — retorna template CSV para download
export async function GET() {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  const cabecalho = 'nome_servico,categoria,valor,moeda,periodo,data_inicio,dia_cobranca,status,participantes\n'
  const exemplo = 'Netflix,Streaming,55.90,BRL,mensal,2024-01-01,15,ativo,1\n'
  const csv = cabecalho + exemplo

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="template_assinaturas.csv"',
    },
  })
}

// POST /api/subscriptions/import — importa assinaturas via CSV
export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 })

  const arquivo = formData.get('file') as File | null
  if (!arquivo) return NextResponse.json({ erro: 'Arquivo CSV não enviado.' }, { status: 400 })

  const texto = await arquivo.text()
  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  if (linhas.length < 2) {
    return NextResponse.json({ erro: 'CSV deve ter ao menos uma linha de dados além do cabeçalho.' }, { status: 400 })
  }

  const cabecalho = linhas[0].split(',').map(c => c.trim().toLowerCase())

  // Valida colunas obrigatórias
  const colunasFaltando = COLUNAS_OBRIGATORIAS.filter(c => !cabecalho.includes(c))
  if (colunasFaltando.length > 0) {
    return NextResponse.json({
      erro: `Colunas obrigatórias ausentes: ${colunasFaltando.join(', ')}.`,
    }, { status: 400 })
  }

  // Garante categorias padrão no banco
  await categoriaRepo.ensureCategoriasPadrao().catch(() => {})

  const importados: number[] = []
  const rejeitados: Array<{ linha: number; motivo: string }> = []

  for (let i = 1; i < linhas.length; i++) {
    const linha = i + 1
    const valores = linhas[i].split(',').map(v => v.trim())
    const registro: Record<string, string> = {}
    cabecalho.forEach((col, idx) => { registro[col] = valores[idx] ?? '' })

    // Valida campos obrigatórios
    const faltando = COLUNAS_OBRIGATORIAS.filter(c => !registro[c])
    if (faltando.length > 0) {
      rejeitados.push({ linha, motivo: `Campos obrigatórios ausentes: ${faltando.join(', ')}.` })
      continue
    }

    // Valida período
    if (!PERIODOS_VALIDOS.includes(registro.periodo)) {
      rejeitados.push({ linha, motivo: `Período inválido: "${registro.periodo}". Use: ${PERIODOS_VALIDOS.join(', ')}.` })
      continue
    }

    // Valida valor
    const valor = Number(registro.valor)
    if (isNaN(valor) || valor <= 0) {
      rejeitados.push({ linha, motivo: `Valor inválido: "${registro.valor}".` })
      continue
    }

    // Valida dia de cobrança
    const diaCobranca = Number(registro.dia_cobranca)
    if (isNaN(diaCobranca) || diaCobranca < 1 || diaCobranca > 31) {
      rejeitados.push({ linha, motivo: `Dia de cobrança inválido: "${registro.dia_cobranca}".` })
      continue
    }

    // Valida data de início
    const dataInicio = new Date(registro.data_inicio)
    if (isNaN(dataInicio.getTime())) {
      rejeitados.push({ linha, motivo: `Data de início inválida: "${registro.data_inicio}".` })
      continue
    }

    // Verifica duplicata por nome
    const { assinaturas: existentes } = await svc.listar(sessao.id, { nome: registro.nome_servico }).then(a => ({ assinaturas: a }))
    const duplicata = existentes.find(
      (a: { nome_servico: string }) => a.nome_servico.toLowerCase() === registro.nome_servico.toLowerCase()
    )
    if (duplicata) {
      rejeitados.push({ linha, motivo: `Assinatura "${registro.nome_servico}" já existe no sistema.` })
      continue
    }

    // Resolve categoria (cria personalizada se não existir)
    let categoria = await categoriaRepo.findByNomeEUsuario(registro.categoria, sessao.id)
    if (!categoria) {
      categoria = await categoriaRepo.create(registro.categoria, sessao.id)
    }

    // Cria a assinatura
    const resultado = await svc.criar(sessao.id, {
      nomeServico: registro.nome_servico,
      categoriaId: categoria.id,
      valor,
      moeda: registro.moeda || 'BRL',
      periodo: registro.periodo,
      dataInicio: registro.data_inicio,
      diaCobranca,
      status: registro.status || 'ativo',
      participantes: Number(registro.participantes) || 1,
    })

    if (resultado.erro) {
      rejeitados.push({ linha, motivo: resultado.erro })
    } else {
      importados.push(resultado.assinatura!.id)
    }
  }

  return NextResponse.json({
    importados: importados.length,
    rejeitados,
    total: linhas.length - 1,
  })
}
