import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import BriefingModal from '../components/BriefingModal'
import { supabase } from '../lib/supabase'
import { Briefing } from '../lib/types'

export default function Briefings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [selected, setSelected] = useState<Briefing | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
      if (!ws) {
        navigate('/onboarding')
        return
      }

      const { data } = await supabase
        .from('briefings')
        .select('*')
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: false })
      setBriefings((data ?? []) as Briefing[])
      setLoading(false)
    })()
  }, [navigate])

  async function handleCopy(b: Briefing) {
    try {
      await navigator.clipboard.writeText(b.content_md)
      setCopiedId(b.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      /* noop */
    }
  }

  function movementCount(md: string): number {
    const bullets = md.match(/^[\-\*]\s+/gm)
    return bullets ? bullets.length : 5
  }

  return (
    <div className="app-shell">
      <Sidebar active="briefings" />
      <main className="main-content">
        <h2 style={{ marginBottom: 8 }}>Todos os briefings</h2>
        <p className="text-muted" style={{ marginBottom: 32 }}>
          Histórico completo das análises semanais.
        </p>

        {loading ? (
          <p className="text-muted">Carregando...</p>
        ) : briefings.length === 0 ? (
          <div className="card text-muted">
            Nenhum briefing ainda. O primeiro chega no próximo domingo.
          </div>
        ) : (
          <div className="stack-12">
            {briefings.map((b) => (
              <div key={b.id} className="card">
                <div className="row-between">
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Semana de {formatDate(b.period_start)} a {formatDate(b.period_end)}
                    </div>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      Entregue em {new Date(b.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="row" style={{ alignItems: 'center' }}>
                    <span className="badge">{movementCount(b.content_md)} movimentos</span>
                    <button className="btn-secondary" onClick={() => setSelected(b)}>
                      Ver
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => handleCopy(b)}
                      style={{ color: copiedId === b.id ? 'var(--success)' : undefined }}
                    >
                      {copiedId === b.id ? '✓ Copiado!' : 'Copiar texto'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <BriefingModal briefing={selected} onClose={() => setSelected(null)} />
        )}
      </main>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
