import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import BriefingModal from '../components/BriefingModal'
import { supabase } from '../lib/supabase'
import { Briefing, Competitor, Workspace } from '../lib/types'

export default function Dashboard() {
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [latestBriefing, setLatestBriefing] = useState<Briefing | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        navigate('/auth')
        return
      }
      const userId = session.session.user.id

      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (!ws) {
        navigate('/onboarding')
        return
      }
      setWorkspace(ws as Workspace)

      const { data: comps } = await supabase
        .from('competitors')
        .select('*')
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: true })
      setCompetitors((comps ?? []) as Competitor[])

      const { data: briefs } = await supabase
        .from('briefings')
        .select('*')
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: false })
        .limit(1)
      if (briefs && briefs.length > 0) setLatestBriefing(briefs[0] as Briefing)

      setLoading(false)
    })()
  }, [navigate])

  const trialDaysLeft = useMemo(() => {
    if (!workspace) return 0
    const ends = new Date(workspace.trial_ends_at).getTime()
    return Math.max(0, Math.ceil((ends - now) / (1000 * 60 * 60 * 24)))
  }, [workspace, now])

  const countdown = useMemo(() => nextSundayCountdown(now), [now])

  const briefingPreview = useMemo(() => {
    if (!latestBriefing) return ''
    return latestBriefing.content_md.split('\n').filter(Boolean).slice(0, 3).join('\n')
  }, [latestBriefing])

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar active="dashboard" />
        <main className="main-content">
          <p className="text-muted">Carregando...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar active="dashboard" />
      <main className="main-content">
        <h2 style={{ marginBottom: 8 }}>Olá, {workspace?.company_name} 👋</h2>
        <p className="text-muted" style={{ marginBottom: 32 }}>
          Aqui está o radar dos seus concorrentes.
        </p>

        {workspace?.status === 'trial' && (
          <div
            style={{
              background: '#fef1e8',
              border: '1.5px solid var(--accent)',
              borderRadius: 'var(--radius)',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <div>
              <strong>{trialDaysLeft} dias restantes</strong> no seu trial gratuito.
            </div>
            <Link to="/planos" className="btn-primary" style={{ padding: '10px 20px' }}>
              Assinar agora
            </Link>
          </div>
        )}

        {/* Countdown card */}
        <div
          className="card"
          style={{
            background: 'var(--dark)',
            color: '#fff',
            border: 'none',
            marginBottom: 32,
          }}
        >
          <div className="text-muted" style={{ fontSize: 13, marginBottom: 6, color: '#a0a0a0' }}>
            Próximo briefing em
          </div>
          <div style={{ fontFamily: 'Sora', fontSize: 42, fontWeight: 800, color: 'var(--accent)' }}>
            {countdown.days}d {countdown.hours}h
          </div>
          <div className="text-muted" style={{ fontSize: 13, marginTop: 4, color: '#a0a0a0' }}>
            Entrega automática todo domingo às 8h no WhatsApp e email
          </div>
        </div>

        {/* Competitors grid */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: 16 }}>
            Concorrentes monitorados ({competitors.length})
          </h3>
          {competitors.length === 0 ? (
            <div className="card text-muted">
              Nenhum concorrente cadastrado ainda.{' '}
              <Link to="/settings" className="text-accent" style={{ fontWeight: 600 }}>
                Adicionar agora →
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {competitors.map((c) => (
                <div key={c.id} className="card">
                  <div className="row-between" style={{ marginBottom: 8 }}>
                    <strong>{c.name}</strong>
                    <span className="badge badge-green">ativo</span>
                  </div>
                  {c.website_url && (
                    <div className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
                      🌐 {c.website_url}
                    </div>
                  )}
                  {c.instagram_handle && (
                    <div className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
                      📸 @{c.instagram_handle}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['site', 'instagram', 'meta ads', 'maps', 'vagas'].map((s) => (
                      <span
                        key={s}
                        className="badge badge-muted"
                        style={{ fontSize: 11 }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest briefing */}
        <div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: 16 }}>Último briefing</h3>
          {latestBriefing ? (
            <div className="card">
              <div className="row-between" style={{ marginBottom: 12 }}>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  Semana de {formatDate(latestBriefing.period_start)} a{' '}
                  {formatDate(latestBriefing.period_end)}
                </div>
                <button className="btn-primary" onClick={() => setModalOpen(true)}>
                  Ver completo
                </button>
              </div>
              <div style={{ whiteSpace: 'pre-line', color: 'var(--muted)' }}>
                {briefingPreview}...
              </div>
            </div>
          ) : (
            <div className="card text-muted">
              Seu primeiro briefing chegará no próximo domingo. Enquanto isso, nossos
              robôs estão coletando dados.
            </div>
          )}
        </div>

        {modalOpen && latestBriefing && (
          <BriefingModal briefing={latestBriefing} onClose={() => setModalOpen(false)} />
        )}
      </main>
    </div>
  )
}

function nextSundayCountdown(now: number) {
  const d = new Date(now)
  const day = d.getDay() // 0=sun
  const daysUntilSunday = day === 0 ? (d.getHours() >= 8 ? 7 : 0) : 7 - day
  const target = new Date(d)
  target.setDate(d.getDate() + daysUntilSunday)
  target.setHours(8, 0, 0, 0)
  const diff = Math.max(0, target.getTime() - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return { days, hours }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
