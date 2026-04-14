import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

export default function Auth() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        navigate('/onboarding')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const userId = data.user?.id
      if (!userId) throw new Error('Falha ao recuperar usuário.')

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      navigate(workspace ? '/dashboard' : '/onboarding')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(traduzErro(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="text-center" style={{ marginBottom: 32 }}>
          <Link
            to="/"
            style={{ fontFamily: 'Sora', fontSize: 28, fontWeight: 800 }}
          >
            Radar<span style={{ color: 'var(--accent)' }}>IA</span>
          </Link>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.35rem', marginBottom: 6 }}>
            {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta grátis'}
          </h3>
          <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
            {mode === 'login'
              ? 'Acesse seu dashboard de concorrentes.'
              : '7 dias grátis. Sem cartão de crédito.'}
          </p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="voce@empresa.com.br"
              />
            </div>
            <div className="form-group">
              <label className="label">Senha</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading
                ? 'Aguarde...'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Criar conta →'}
            </button>
          </form>

          <div className="text-center" style={{ marginTop: 20, fontSize: 14 }}>
            {mode === 'login' ? (
              <>
                Não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                    setError(null)
                  }}
                  style={{ color: 'var(--accent)', fontWeight: 600 }}
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                  }}
                  style={{ color: 'var(--accent)', fontWeight: 600 }}
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function traduzErro(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email ou senha inválidos.'
  if (/user already registered/i.test(msg)) return 'Já existe uma conta com esse email.'
  if (/password should be/i.test(msg)) return 'Senha muito curta — mínimo 6 caracteres.'
  return msg
}
