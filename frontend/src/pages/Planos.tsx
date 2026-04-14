import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { supabase } from '../lib/supabase'
import { Workspace } from '../lib/types'

interface PlanCard {
  name: string
  key: 'starter' | 'pro'
  price: number
  maxComps: number
  features: string[]
  highlight?: boolean
}

const PLANS: PlanCard[] = [
  {
    name: 'Starter',
    key: 'starter',
    price: 39,
    maxComps: 3,
    features: [
      'Até 3 concorrentes',
      '5 fontes monitoradas diariamente',
      'Briefing semanal no WhatsApp',
      'Briefing semanal por email',
      'Histórico completo de briefings',
    ],
  },
  {
    name: 'Pro',
    key: 'pro',
    price: 97,
    maxComps: 8,
    highlight: true,
    features: [
      'Até 8 concorrentes',
      '5 fontes monitoradas diariamente',
      'Briefing semanal no WhatsApp',
      'Briefing semanal por email',
      'Histórico completo de briefings',
      'Suporte prioritário',
    ],
  },
]

export default function Planos() {
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<'starter' | 'pro' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        navigate('/auth')
        return
      }
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', session.session.user.id)
        .maybeSingle()
      if (!ws) {
        navigate('/onboarding')
        return
      }
      setWorkspace(ws as Workspace)
      setLoading(false)
    })()
  }, [navigate])

  async function handleAssinar(planName: 'starter' | 'pro') {
    if (!workspace) return
    setError(null)
    setProcessingPlan(planName)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: workspace.id,
            plan_name: planName,
            success_url: `${window.location.origin}/dashboard?payment=success`,
            cancel_url: `${window.location.origin}/planos`,
          }),
        },
      )

      const payload = await res.json()
      if (payload.error) throw new Error(payload.error)
      if (!payload.checkout_url) throw new Error('URL de checkout ausente na resposta.')

      // Redireciona para o Stripe Checkout (página hosted pelo Stripe)
      window.location.href = payload.checkout_url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError('Erro ao iniciar checkout: ' + msg)
      setProcessingPlan(null)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar active="planos" />
      <main className="main-content">
        <h2 style={{ marginBottom: 8 }}>Planos</h2>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Escolha o plano que faz sentido para sua operação. Cancele quando quiser.
        </p>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="text-muted">Carregando...</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 24,
              maxWidth: 860,
            }}
          >
            {PLANS.map((p) => (
              <div
                key={p.key}
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
                  <span style={{ fontFamily: 'Sora', fontSize: 40, fontWeight: 800 }}>
                    ${p.price}
                  </span>
                  <span className="text-muted"> / mês</span>
                </div>
                <ul style={{ lineHeight: 2, marginBottom: 24 }}>
                  {p.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <button
                  className="btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => handleAssinar(p.key)}
                  disabled={processingPlan !== null}
                >
                  {processingPlan === p.key
                    ? 'Redirecionando...'
                    : `Assinar ${p.name}`}
                </button>
              </div>
            ))}
          </div>
        )}

        {workspace?.status === 'trial' && (
          <p className="text-muted" style={{ marginTop: 32, fontSize: 13 }}>
            Você está no período de trial gratuito até{' '}
            {new Date(workspace.trial_ends_at).toLocaleDateString('pt-BR')}.
          </p>
        )}
      </main>
    </div>
  )
}
