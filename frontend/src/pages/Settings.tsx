import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { supabase } from '../lib/supabase'
import { Competitor, Plan, Subscription, Workspace } from '../lib/types'

export default function Settings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  // competitor draft (add form)
  const [draft, setDraft] = useState({ name: '', website: '', instagram: '' })
  const [addErr, setAddErr] = useState<string | null>(null)

  // delivery form
  const [whatsapp, setWhatsapp] = useState('')
  const [reportEmail, setReportEmail] = useState('')
  const [deliveryMsg, setDeliveryMsg] = useState<string | null>(null)

  // report day form
  const [reportDayOfWeek, setReportDayOfWeek] = useState(0)
  const [reportDayMsg, setReportDayMsg] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        navigate('/auth')
        return
      }
      const userId = session.session.user.id

      const [wsRes, plansRes] = await Promise.all([
        supabase.from('workspaces').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('plans').select('*'),
      ])

      if (!wsRes.data) {
        navigate('/onboarding')
        return
      }
      const ws = wsRes.data as Workspace
      setWorkspace(ws)
      setWhatsapp(ws.whatsapp_number ?? '')
      setReportEmail(ws.report_email ?? '')
      setReportDayOfWeek(ws.report_day_of_week ?? 0)
      setPlans((plansRes.data ?? []) as Plan[])

      const [compsRes, subRes] = await Promise.all([
        supabase
          .from('competitors')
          .select('*')
          .eq('workspace_id', ws.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('workspace_id', ws.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ])
      setCompetitors((compsRes.data ?? []) as Competitor[])
      if (subRes.data && subRes.data.length > 0) {
        setSubscription(subRes.data[0] as Subscription)
      }

      setLoading(false)
    })()
  }, [navigate])

  const currentPlan = plans.find((p) => p.id === workspace?.plan_id)
  const maxCompetitors = currentPlan?.max_competitors ?? 3

  async function handleAddCompetitor(e: FormEvent) {
    e.preventDefault()
    setAddErr(null)
    if (!draft.name.trim()) {
      setAddErr('Informe o nome do concorrente.')
      return
    }
    if (competitors.length >= maxCompetitors) {
      setAddErr(`Limite do plano atingido (${maxCompetitors}).`)
      return
    }
    if (!workspace) return
    const { data, error } = await supabase
      .from('competitors')
      .insert({
        workspace_id: workspace.id,
        name: draft.name,
        website_url: draft.website || null,
        instagram_handle: draft.instagram || null,
      })
      .select()
      .single()
    if (error) {
      setAddErr(error.message)
      return
    }
    setCompetitors([...competitors, data as Competitor])
    setDraft({ name: '', website: '', instagram: '' })
  }

  async function handleRemoveCompetitor(id: string) {
    if (!confirm('Remover este concorrente?')) return
    const { error } = await supabase.from('competitors').delete().eq('id', id)
    if (!error) setCompetitors(competitors.filter((c) => c.id !== id))
  }

  async function handleSaveDelivery(e: FormEvent) {
    e.preventDefault()
    setDeliveryMsg(null)
    if (!workspace) return
    const { error } = await supabase
      .from('workspaces')
      .update({ whatsapp_number: whatsapp, report_email: reportEmail })
      .eq('id', workspace.id)
    if (error) {
      setDeliveryMsg('Erro: ' + error.message)
      return
    }
    setDeliveryMsg('Salvo com sucesso.')
    setTimeout(() => setDeliveryMsg(null), 2500)
  }

  async function handleSaveReportDay(e: FormEvent) {
    e.preventDefault()
    setReportDayMsg(null)
    if (!workspace) return
    const { error } = await supabase
      .from('workspaces')
      .update({ report_day_of_week: reportDayOfWeek })
      .eq('id', workspace.id)
    if (error) {
      setReportDayMsg('Erro: ' + error.message)
      return
    }
    setReportDayMsg('Salvo com sucesso.')
    setTimeout(() => setReportDayMsg(null), 2500)
  }

  async function handleCancelSubscription() {
    if (!subscription || !workspace) return
    if (
      !confirm(
        'Tem certeza que quer cancelar sua assinatura? Você continua com acesso até o final do período pago.',
      )
    )
      return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ workspace_id: workspace.id }),
        },
      )

      const payload = await res.json()
      if (!res.ok || payload.error) {
        throw new Error(payload.error ?? 'Falha ao cancelar')
      }

      setSubscription({ ...subscription, status: 'cancelled' })
      alert('Assinatura agendada para cancelamento ao final do período atual.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      alert('Erro ao cancelar: ' + msg)
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar active="settings" />
        <main className="main-content">
          <p className="text-muted">Carregando...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar active="settings" />
      <main className="main-content" style={{ maxWidth: 820 }}>
        <h2 style={{ marginBottom: 8 }}>Configurações</h2>
        <p className="text-muted" style={{ marginBottom: 32 }}>
          Ajuste concorrentes, canais de entrega e assinatura.
        </p>

        {/* Concorrentes */}
        <section className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: 4 }}>Concorrentes</h3>
          <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
            {competitors.length} de {maxCompetitors} usados.
          </p>

          <div className="stack-12" style={{ marginBottom: 16 }}>
            {competitors.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: 14,
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                }}
                className="row-between"
              >
                <div>
                  <strong>{c.name}</strong>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    {c.website_url ?? '—'}
                    {c.instagram_handle ? ` · @${c.instagram_handle}` : ''}
                  </div>
                </div>
                <button className="btn-danger" onClick={() => handleRemoveCompetitor(c.id)}>
                  Remover
                </button>
              </div>
            ))}
            {competitors.length === 0 && (
              <div className="text-muted" style={{ fontSize: 14 }}>
                Nenhum concorrente ainda.
              </div>
            )}
          </div>

          {competitors.length < maxCompetitors && (
            <form onSubmit={handleAddCompetitor} className="stack-12">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                }}
              >
                <input
                  className="input"
                  placeholder="Nome"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Site"
                  value={draft.website}
                  onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Instagram (sem @)"
                  value={draft.instagram}
                  onChange={(e) => setDraft({ ...draft, instagram: e.target.value })}
                />
              </div>
              {addErr && <div className="error-banner">{addErr}</div>}
              <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                + Adicionar concorrente
              </button>
            </form>
          )}
        </section>

        {/* Entrega */}
        <section className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: 4 }}>Entrega do briefing</h3>
          <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Onde você quer receber o briefing semanal.
          </p>

          {deliveryMsg && (
            <div className={deliveryMsg.startsWith('Erro') ? 'error-banner' : 'success-banner'}>
              {deliveryMsg}
            </div>
          )}

          <form onSubmit={handleSaveDelivery}>
            <div className="form-group">
              <label className="label">WhatsApp</label>
              <input
                className="input"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="5511999999999"
              />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
              />
            </div>
            <button className="btn-primary">Salvar</button>
          </form>
        </section>

        {/* Dia do briefing */}
        <section className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: 4 }}>Dia do briefing</h3>
          <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Qual dia da semana você quer receber seu briefing?
          </p>

          {reportDayMsg && (
            <div className={reportDayMsg.startsWith('Erro') ? 'error-banner' : 'success-banner'}>
              {reportDayMsg}
            </div>
          )}

          <form onSubmit={handleSaveReportDay}>
            <div className="form-group">
              <label className="label">Dia da semana</label>
              <select
                className="input"
                value={reportDayOfWeek}
                onChange={(e) => setReportDayOfWeek(Number(e.target.value))}
              >
                <option value={0}>Domingo</option>
                <option value={1}>Segunda-feira</option>
                <option value={2}>Terça-feira</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
              </select>
            </div>
            <button className="btn-primary">Salvar</button>
          </form>
        </section>

        {/* Assinatura */}
        <section className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: 4 }}>Assinatura</h3>
          <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Status do seu plano e próxima cobrança.
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            <div className="row-between">
              <span className="text-muted">Plano atual</span>
              <strong>{currentPlan?.name ?? (workspace?.status === 'trial' ? 'Trial' : '—')}</strong>
            </div>
            <div className="row-between">
              <span className="text-muted">Status</span>
              <span
                className={`badge ${
                  subscription?.status === 'paid'
                    ? 'badge-green'
                    : subscription?.status === 'cancelled'
                      ? 'badge-muted'
                      : ''
                }`}
              >
                {subscription?.status ?? workspace?.status ?? '—'}
              </span>
            </div>
            <div className="row-between">
              <span className="text-muted">Próxima renovação</span>
              <span>
                {subscription?.next_billing_at
                  ? new Date(subscription.next_billing_at).toLocaleDateString('pt-BR')
                  : '—'}
              </span>
            </div>
          </div>

          {subscription && subscription.status !== 'cancelled' && (
            <button
              className="btn-danger"
              style={{ marginTop: 20 }}
              onClick={handleCancelSubscription}
            >
              Cancelar assinatura
            </button>
          )}
        </section>
      </main>
    </div>
  )
}
