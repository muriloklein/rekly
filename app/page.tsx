import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ─── NAVBAR ─── */}
      <header className="bg-indigo-600 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-white text-2xl font-black tracking-tight select-none">Rekly</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
          href="/login"
          className="text-sm font-bold text-indigo-100 hover:text-white transition px-4 py-2"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="text-sm bg-[#F5C518] text-[#1a1a1a] font-bold px-5 py-2 rounded-full hover:bg-yellow-300 transition"
          >
            Criar conta
          </Link>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-24 px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block bg-indigo-100 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full mb-5 uppercase tracking-wider">
              Controle financeiro pessoal
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-indigo-600 leading-tight mb-5">
              O caminho mais simples para uma vida financeira organizada
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Centralize todas as suas assinaturas em um único lugar, acompanhe vencimentos e mantenha seu orçamento sempre sob controle.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="bg-[#F5C518] text-[#1a1a1a] font-bold px-8 py-3 rounded-full text-base hover:bg-yellow-300 transition shadow-md"
              >
                Começar agora
              </Link>
              <a
                href="#como-funciona"
                className="border-2 border-indigo-600 text-indigo-600 font-semibold px-8 py-3 rounded-full text-base hover:bg-indigo-50 transition"
              >
                Saiba mais
              </a>
            </div>
          </div>

          {/* Card de preview */}
          <div className="flex justify-center">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-80 border border-indigo-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-gray-700">Gasto mensal</span>
                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Junho 2026</span>
              </div>
              <p className="text-3xl font-black text-indigo-600 mb-1">R$ 187,90</p>
              <p className="text-xs text-gray-400 mb-5">Seu custo real: <span className="text-green-600 font-semibold">R$ 124,30</span></p>
              <div className="space-y-3">
                {[
                  { nome: 'Netflix', cat: 'Streaming', valor: 'R$ 18,90', cor: 'bg-red-100 text-red-700' },
                  { nome: 'Spotify', cat: 'Música', valor: 'R$ 11,90', cor: 'bg-green-100 text-green-700' },
                  { nome: 'Adobe CC', cat: 'Software', valor: 'R$ 89,90', cor: 'bg-blue-100 text-blue-700' },
                  { nome: 'Academia', cat: 'Saúde', valor: 'R$ 79,90', cor: 'bg-orange-100 text-orange-700' },
                ].map((s) => (
                  <div key={s.nome} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{s.nome}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cor}`}>{s.cat}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{s.valor}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                <p className="text-xs text-yellow-700 font-semibold">💡 Você tem 2 serviços de Streaming. Considere cancelar um!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section id="como-funciona" className="py-20 px-8 bg-white">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <h2 className="text-3xl font-black text-gray-900 mb-3">Organizar suas finanças nunca foi tão fácil</h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Cuidar do seu dinheiro pode ser simples. Com o Rekly, você organiza e planeja sua vida financeira com facilidade.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              icone: '📋',
              titulo: 'Cadastre suas assinaturas',
              desc: 'Registre todos os seus serviços recorrentes: streaming, software, academia e muito mais.',
            },
            {
              icone: '💡',
              titulo: 'Receba sugestões de economia',
              desc: 'O sistema detecta automaticamente serviços sobrepostos e assinaturas em desuso.',
            },
            {
              icone: '👥',
              titulo: 'Compartilhe e divida custos',
              desc: 'Indique assinaturas compartilhadas e veja seu custo real individual calculado automaticamente.',
            },
          ].map((item) => (
            <div key={item.titulo} className="bg-indigo-50 rounded-2xl p-7 text-left border border-indigo-100 hover:shadow-lg transition">
              <span className="text-3xl mb-4 block">{item.icone}</span>
              <h3 className="text-base font-black text-gray-900 mb-2">{item.titulo}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── RECURSOS ─── */}
      <section id="recursos" className="py-20 px-8 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Tudo que você precisa</h2>
            <p className="text-gray-500">Funcionalidades pensadas para quem quer organização real.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { titulo: 'Dashboard completo', desc: 'Visualize gastos mensais, vencimentos próximos e pagamentos pendentes em um painel intuitivo.', cor: 'border-indigo-500' },
              { titulo: 'Alertas por e-mail', desc: 'Receba notificações automáticas de vencimento e pagamentos em atraso direto na sua caixa de entrada.', cor: 'border-yellow-400' },
              { titulo: 'Histórico de pagamentos', desc: 'Acompanhe todas as cobranças realizadas com filtros por período, status e assinatura.', cor: 'border-blue-400' },
              { titulo: 'Importação via CSV', desc: 'Cadastre múltiplas assinaturas de uma vez importando um arquivo CSV com seus serviços.', cor: 'border-green-400' },
              { titulo: 'Inteligência de economia', desc: 'Detecção automática de sobreposições de serviços e assinaturas sem uso nos últimos meses.', cor: 'border-orange-400' },
              { titulo: 'Conformidade com LGPD', desc: 'Exporte ou exclua seus dados pessoais a qualquer momento, com total segurança e transparência.', cor: 'border-red-400' },
            ].map((r) => (
              <div key={r.titulo} className={`bg-white rounded-2xl p-6 border-l-4 ${r.cor} shadow-sm hover:shadow-md transition`}>
                <h3 className="font-bold text-gray-900 mb-1">{r.titulo}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="bg-indigo-600 py-20 px-8 text-center">
        <h2 className="text-3xl font-black text-white mb-4">Comece a organizar suas finanças hoje</h2>
        <p className="text-indigo-200 mb-8 max-w-md mx-auto">
          Crie sua conta gratuitamente e tenha controle total sobre suas assinaturas pessoais.
        </p>
        <Link
          href="/register"
          className="inline-block bg-[#F5C518] text-[#1a1a1a] font-black px-10 py-4 rounded-full text-lg hover:bg-yellow-300 transition shadow-lg"
        >
          Criar conta
        </Link>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-gray-900 py-8 px-8 text-center text-gray-500 text-sm">
        <p>© 2026 Rekly.</p>
        <p className="mt-1">Samuel V. Zibetti · Guilherme S. Machado · Murilo K. Klein</p>
      </footer>

    </div>
  )
}