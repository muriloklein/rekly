'use client'

import { useState, useEffect, useCallback } from 'react'

interface Categoria { id: number; nome: string; is_padrao: boolean }

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [novoNome, setNovoNome] = useState('')
  const [editando, setEditando] = useState<{ id: number; nome: string } | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async () => {
    const res = await fetch('/api/categories', {
      credentials: 'include',
    })

    if (res.status === 401) {
      handle401()
      return
    }

    const data = await res.json()
    if (data.categorias) setCategorias(data.categorias)
  }, [])

  const handle401 = useCallback(() => {
    window.location.href = '/login'
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function feedback(msg: string, tipo: 'erro' | 'ok') {
    if (tipo === 'erro') { setErro(msg); setSucesso('') }
    else { setSucesso(msg); setErro('') }
    setTimeout(() => { setErro(''); setSucesso('') }, 3500)
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setCarregando(true)
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome }),
    })
    const data = await res.json()
    setCarregando(false)
    if (!res.ok) { feedback(data.erro, 'erro'); return }
    setNovoNome('')
    feedback('Categoria criada com sucesso!', 'ok')
    carregar()
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setCarregando(true)
    const res = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editando.id, nome: editando.nome }),
    })
    const data = await res.json()
    setCarregando(false)
    if (!res.ok) { feedback(data.erro, 'erro'); return }
    setEditando(null)
    feedback('Categoria atualizada!', 'ok')
    carregar()
  }

  async function handleExcluir(id: number, nome: string) {
    if (!confirm(`Excluir a categoria "${nome}"?`)) return
    const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { feedback(data.erro, 'erro'); return }
    feedback('Categoria excluída.', 'ok')
    carregar()
  }

  const padrao = categorias.filter(c => c.is_padrao)
  const personalizadas = categorias.filter(c => !c.is_padrao)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Categorias</h1>

      {erro && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{erro}</div>}
      {sucesso && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{sucesso}</div>}

      {/* Criar nova */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Nova categoria</h2>
        <form onSubmit={handleCriar} className="flex gap-2">
          <input
            type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome da categoria" required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" disabled={carregando}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60">
            Adicionar
          </button>
        </form>
      </div>

      {/* Personalizadas */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Minhas categorias</h2>
        {personalizadas.length === 0
          ? <p className="text-sm text-gray-400">Nenhuma categoria personalizada ainda.</p>
          : <ul className="space-y-2">
              {personalizadas.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  {editando?.id === c.id
                    ? <form onSubmit={handleEditar} className="flex gap-2 flex-1">
                        <input autoFocus value={editando.nome} onChange={e => setEditando({ ...editando, nome: e.target.value })}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button type="submit" className="text-sm text-indigo-600 font-medium hover:underline">Salvar</button>
                        <button type="button" onClick={() => setEditando(null)} className="text-sm text-gray-400 hover:underline">Cancelar</button>
                      </form>
                    : <>
                        <span className="text-sm text-gray-700">{c.nome}</span>
                        <div className="flex gap-3">
                          <button onClick={() => setEditando({ id: c.id, nome: c.nome })}
                            className="text-xs text-indigo-600 hover:underline">Editar</button>
                          <button onClick={() => handleExcluir(c.id, c.nome)}
                            className="text-xs text-red-500 hover:underline">Excluir</button>
                        </div>
                      </>}
                </li>
              ))}
            </ul>}
      </div>

      {/* Padrão */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Categorias padrão</h2>
        <div className="flex flex-wrap gap-2">
          {padrao.map(c => (
            <span key={c.id} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{c.nome}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
