import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg)' }}>
      {/* NAV */}
      <nav style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container row-between">
          <Link to="/" style={{ fontFamily: 'Sora', fontSize: 24, fontWeight: 800 }}>
            Radar<span style={{ color: 'var(--accent)' }}>IA</span>
          </Link>
          <Link to="/auth" className="btn-primary">
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '96px 0 72px' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 860 }}>
          <div className="badge" style={{ marginBottom: 24 }}>🎯 Inteligência competitiva automatizada</div>
          <h1 style={{ fontSize: '4rem', lineHeight: 1.05 }}>
            Seus concorrentes se mexeram.
            <br />
            <span style={{ color: 'var(--accent)' }}>Você fica sabendo domingo de manhã.</span>
          </h1>
          <p style={{ fontSize: 20, color: 'var(--muted)', margin: '24px auto 40px', maxWidth: 640 }}>
            Monitoramos site, Instagram, Meta Ads, Google Maps e vagas dos seus concorrentes
            todos os dias. Toda semana você recebe um briefing direto no WhatsApp.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/auth" className="btn-primary">
              Começar grátis por 7 dias →
            </Link>
            <a href="#mockup" className="btn-secondary">
              Ver exemplo
            </a>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ background: 'var(--dark)', padding: '40px 0', color: '#fff' }}>
        <div
          className="container"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}
        >
          {[
            { n: '+340', l: 'empresas confiam' },
            { n: '5', l: 'fontes monitoradas' },
            { n: '0h', l: 'do seu tempo' },
            { n: '7 dias', l: 'grátis' },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'Sora',
                  fontSize: 36,
                  fontWeight: 800,
                  color: 'var(--accent)',
                }}
              >
                {s.n}
              </div>
              <div style={{ fontSize: 14, color: '#bdbdbd', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MOCKUP WHATSAPP */}
      <section id="mockup" style={{ padding: '96px 0' }}>
        <div
          className="container"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}
        >
          <div>
            <h2>Chega domingo de manhã, direto no seu zap.</h2>
            <p style={{ color: 'var(--muted)', marginTop: 20, fontSize: 18 }}>
              Sem login, sem dashboard, sem enrolação. Você abre, lê em 2 minutos e já sabe
              o que os seus concorrentes fizeram na semana.
            </p>
          </div>

          <div
            style={{
              background: '#ece5dd',
              padding: 24,
              borderRadius: 20,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div
              style={{
                background: '#dcf8c6',
                padding: 16,
                borderRadius: 12,
                fontSize: 14,
                color: '#222',
                whiteSpace: 'pre-line',
                animation: 'fadeIn 0.6s ease',
              }}
            >
              {`📊 *Briefing semanal — Clínica Sorrir*
Semana de 07 a 14 de abril

*Resumo:* 3 dos 4 concorrentes lançaram campanhas de clareamento dental esta semana. Tendência clara.

*OdontoPrime*
• Novo post com Reel (28k views) sobre clareamento
• +R$1.200 em Meta Ads nesta categoria

*Clínica Bella*
• Promoção "R$99 primeira consulta" no Google Maps
• 4 avaliações novas (média 4.8)

💡 *Oportunidade:* Todos atacam clareamento. Aproveite a janela para destacar sua especialidade em ortodontia invisível.

⚠️ *Alerta:* OdontoPrime triplicou o budget em 7 dias. Monitore.`}
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ padding: '72px 0', background: '#fff' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: 56 }}>
            <h2>Como funciona</h2>
            <p className="text-muted" style={{ marginTop: 12 }}>
              Três passos. Uma única configuração inicial. Depois é só receber.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              {
                icon: '🎯',
                title: '1. Cadastre seus concorrentes',
                desc: 'Nome, site, Instagram. Até 3 no Starter ou 8 no Pro.',
              },
              {
                icon: '🤖',
                title: '2. Nossos robôs coletam',
                desc: '5 fontes públicas monitoradas todos os dias. Você não faz nada.',
              },
              {
                icon: '📲',
                title: '3. Receba no WhatsApp',
                desc: 'Todo domingo às 8h, briefing em português, direto no seu celular.',
              },
            ].map((s) => (
              <div key={s.title} className="card">
                <div style={{ fontSize: 40, marginBottom: 12 }}>{s.icon}</div>
                <h3 style={{ fontSize: '1.15rem' }}>{s.title}</h3>
                <p className="text-muted" style={{ marginTop: 8 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RADAR + FONTES */}
      <section style={{ padding: '96px 0' }}>
        <div
          className="container"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                position: 'relative',
                width: 280,
                height: 280,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(224,123,57,0.08) 0%, rgba(224,123,57,0) 70%)',
                border: '2px dashed var(--accent)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background:
                    'conic-gradient(from 0deg, rgba(224,123,57,0.4), transparent 30%)',
                  animation: 'spin 3s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 48,
                }}
              >
                📡
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
          <div>
            <h2>5 fontes. Um radar.</h2>
            <p className="text-muted" style={{ marginTop: 16, marginBottom: 24, fontSize: 18 }}>
              Coletamos sinais públicos de onde a concorrência realmente se movimenta.
            </p>
            <div className="row">
              {['🌐 Site', '📸 Instagram', '💰 Meta Ads', '📍 Google Maps', '💼 Vagas'].map(
                (f) => (
                  <span
                    key={f}
                    className="badge"
                    style={{ fontSize: 14, padding: '8px 16px', background: '#fff', border: '1.5px solid var(--border)', color: 'var(--ink)' }}
                  >
                    {f}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* COMPARATIVO */}
      <section style={{ padding: '72px 0', background: '#fff' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: 48 }}>
            <h2>Por que não contratar uma agência?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="card" style={{ borderColor: '#f5b2b2' }}>
              <div className="badge" style={{ background: '#fde8e8', color: 'var(--danger)' }}>
                Agência tradicional
              </div>
              <h3 style={{ marginTop: 12 }}>R$ 3.500 / mês</h3>
              <ul style={{ marginTop: 16, lineHeight: 2 }}>
                <li>❌ Relatório PDF gigante mensal</li>
                <li>❌ Reuniões toda semana</li>
                <li>❌ Dados defasados de 2-3 semanas</li>
                <li>❌ Dependência de um analista júnior</li>
                <li>❌ Contrato anual</li>
              </ul>
            </div>
            <div className="card" style={{ borderColor: 'var(--accent)' }}>
              <div className="badge">RadarIA</div>
              <h3 style={{ marginTop: 12, color: 'var(--accent)' }}>R$ 197 / mês</h3>
              <ul style={{ marginTop: 16, lineHeight: 2 }}>
                <li>✅ Briefing semanal direto no WhatsApp</li>
                <li>✅ Zero reuniões, zero login</li>
                <li>✅ Dados coletados ontem</li>
                <li>✅ IA analisa o que importa</li>
                <li>✅ Cancele quando quiser</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section style={{ padding: '96px 0' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: 48 }}>
            <h2>O que dizem quem usa</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              {
                stars: '⭐⭐⭐⭐⭐',
                quote:
                  '"Parei de abrir 8 perfis do Instagram toda segunda-feira. Agora recebo tudo mastigado no domingo."',
                author: 'Marina R., clínica odontológica',
              },
              {
                stars: '⭐⭐⭐⭐⭐',
                quote:
                  '"Descobri que um concorrente lançou plano anual 2 semanas antes que eu iria lançar. Salvou meu trimestre."',
                author: 'João P., academia',
              },
              {
                stars: '⭐⭐⭐⭐⭐',
                quote:
                  '"Paguei uma agência R$4k/mês por 6 meses. O RadarIA entrega mais em 10 minutos de leitura."',
                author: 'Carla M., imobiliária',
              },
            ].map((t) => (
              <div key={t.author} className="card">
                <div>{t.stars}</div>
                <p style={{ margin: '16px 0', fontSize: 15 }}>{t.quote}</p>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  — {t.author}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section style={{ padding: '72px 0', background: '#fff' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: 48 }}>
            <h2>Planos simples</h2>
            <p className="text-muted" style={{ marginTop: 12 }}>
              Sem contrato, sem letras miúdas. 7 dias grátis.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 24,
              maxWidth: 820,
              margin: '0 auto',
            }}
          >
            {[
              {
                name: 'Starter',
                price: 197,
                comps: 3,
                features: [
                  'Até 3 concorrentes',
                  '5 fontes monitoradas',
                  'Briefing semanal WhatsApp + email',
                  'Histórico completo',
                ],
              },
              {
                name: 'Pro',
                price: 497,
                comps: 8,
                highlight: true,
                features: [
                  'Até 8 concorrentes',
                  '5 fontes monitoradas',
                  'Briefing semanal WhatsApp + email',
                  'Histórico completo',
                  'Suporte prioritário',
                ],
              },
            ].map((p) => (
              <div
                key={p.name}
                className="card"
                style={{
                  borderColor: p.highlight ? 'var(--accent)' : 'var(--border)',
                  borderWidth: p.highlight ? 2 : 1,
                }}
              >
                {p.highlight && (
                  <div className="badge" style={{ marginBottom: 12 }}>
                    Mais popular
                  </div>
                )}
                <h3>{p.name}</h3>
                <div style={{ margin: '16px 0' }}>
                  <span style={{ fontFamily: 'Sora', fontSize: 42, fontWeight: 800 }}>
                    R$ {p.price}
                  </span>
                  <span className="text-muted"> / mês</span>
                </div>
                <ul style={{ lineHeight: 2, marginBottom: 24 }}>
                  {p.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <Link to="/auth" className="btn-primary" style={{ display: 'inline-block' }}>
                  Começar com {p.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '96px 0' }}>
        <div className="container">
          <div
            style={{
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 24,
              padding: '64px 40px',
              textAlign: 'center',
            }}
          >
            <h2 style={{ color: '#fff' }}>Pare de espiar Instagram de concorrente.</h2>
            <p style={{ marginTop: 16, fontSize: 18, opacity: 0.95 }}>
              Receba tudo mastigado no domingo. Grátis por 7 dias.
            </p>
            <Link
              to="/auth"
              className="btn-white"
              style={{ display: 'inline-block', marginTop: 32 }}
            >
              Começar agora →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container row-between">
          <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 18 }}>
            Radar<span style={{ color: 'var(--accent)' }}>IA</span>
          </div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            © {new Date().getFullYear()} RadarIA. Feito no Brasil.
          </div>
        </div>
      </footer>
    </div>
  )
}
