import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface CompetitorInput {
  name: string
  website: string
  instagram: string
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [companyName, setCompanyName] = useState('')
  const [segment, setSegment] = useState('')

  // Step 2
  const [competitors, setCompetitors] = useState<CompetitorInput[]>([
    { name: '', website: '', instagram: '' },
  ])

  // Step 3
  const [whatsapp, setWhatsapp] = useState('')
  const [reportEmail, setReportEmail] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate('/auth')
    })
  }, [navigate])

  function addCompetitor() {
    if (competitors.length >= 3) return
    setCompetitors([...competitors, { name: '', website: '', instagram: '' }])
  }

  function removeCompetitor(idx: number) {
    setCompetitors(competitors.filter((_, i) => i !== idx))
  }

  function updateCompetitor(idx: number, field: keyof CompetitorInput, value: string) {
    const next = [...competitors]
    next[idx] = { ...next[idx], [field]: value }
    setCompetitors(next)
  }

  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault()
    if (!acceptTerms) {
      setError('Você precisa aceitar os termos.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error('Sessão expirada.')

      const { data: workspace, error: wsErr } = await supabase
        .from('workspaces')
        .insert({
          user_id: userId,
          company_name: companyName,
          segment,
          whatsapp_number: whatsapp,
          report_email: reportEmail,
          status: 'trial',
        })
        .select()
        .single()
      if (wsErr) throw wsErr

      const validComps = competitors.filter((c) => c.name.trim() !== '')
      if (validComps.length > 0) {
        const rows = validComps.map((c) => ({
          workspace_id: workspace.id,
          name: c.name,
          website_url: c.website || null,
          instagram_handle: c.instagram || null,
        }))
        const { error: compErr } = await supabase.from('competitors').insert(rows)
        if (compErr) throw compErr
      }

      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '48px 24px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <div
            className="row-between"
            style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}
          >
            <span>Passo {step} de 3</span>
            <span>{Math.round((step / 3) * 100)}%</span>
          </div>
          <div
            style={{
              height: 6,
              background: 'var(--border)',
              borderRadius: 100,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(step / 3) * 100}%`,
                height: '100%',
                background: 'var(--accent)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <div className="card">
          {error && <div className="error-banner">{error}</div>}

          {step === 1 && (
            <>
              <h3>Sua empresa</h3>
              <p className="text-muted" style={{ marginTop: 8, marginBottom: 24, fontSize: 14 }}>
                Vamos começar com o básico.
              </p>
              <div className="form-group">
                <label className="label">Nome da empresa *</label>
                <input
                  className="input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Clínica Sorriso"
                />
              </div>
              <div className="form-group">
                <label className="label">Segmento</label>
                <select
                  className="select"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="clinica">Clínica / saúde</option>
                  <option value="imobiliaria">Imobiliária</option>
                  <option value="academia">Academia / bem-estar</option>
                  <option value="restaurante">Restaurante / food</option>
                  <option value="escritorio">Escritório (advocacia, contabilidade...)</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                disabled={!companyName.trim()}
                onClick={() => setStep(2)}
              >
                Continuar →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h3>Seus concorrentes</h3>
              <p className="text-muted" style={{ marginTop: 8, marginBottom: 24, fontSize: 14 }}>
                Adicione até 3 concorrentes para monitorar. ({competitors.length} de 3)
              </p>

              {competitors.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                >
                  <div className="row-between" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Concorrente {idx + 1}</span>
                    {competitors.length > 1 && (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => removeCompetitor(idx)}
                        style={{ color: 'var(--danger)', fontSize: 13 }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="stack-12">
                    <input
                      className="input"
                      value={c.name}
                      onChange={(e) => updateCompetitor(idx, 'name', e.target.value)}
                      placeholder="Nome do concorrente"
                    />
                    <input
                      className="input"
                      value={c.website}
                      onChange={(e) => updateCompetitor(idx, 'website', e.target.value)}
                      placeholder="Site (ex: concorrente.com.br)"
                    />
                    <input
                      className="input"
                      value={c.instagram}
                      onChange={(e) => updateCompetitor(idx, 'instagram', e.target.value)}
                      placeholder="Instagram (sem @)"
                    />
                  </div>
                </div>
              ))}

              {competitors.length < 3 && (
                <button
                  type="button"
                  onClick={addCompetitor}
                  className="btn-secondary"
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  + Adicionar concorrente
                </button>
              )}

              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn-ghost" onClick={() => setStep(1)}>
                  ← Voltar
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={!competitors[0]?.name.trim()}
                  onClick={() => setStep(3)}
                >
                  Continuar →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <form onSubmit={handleFinalSubmit}>
              <h3>Como receber o briefing</h3>
              <p className="text-muted" style={{ marginTop: 8, marginBottom: 24, fontSize: 14 }}>
                Todo domingo às 8h você recebe nos dois canais.
              </p>
              <div className="form-group">
                <label className="label">WhatsApp</label>
                <input
                  className="input"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="5511999999999"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Email de entrega</label>
                <input
                  className="input"
                  type="email"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  placeholder="voce@empresa.com.br"
                  required
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  fontSize: 13,
                  margin: '16px 0 8px',
                }}
              >
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>Aceito os termos de uso e política de privacidade.</span>
              </label>

              <div className="row" style={{ marginTop: 16 }}>
                <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
                  ← Voltar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={submitting || !acceptTerms}
                >
                  {submitting ? 'Criando...' : 'Iniciar trial grátis por 7 dias 🚀'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
