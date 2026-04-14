import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Active = 'dashboard' | 'briefings' | 'planos' | 'settings'

interface Props {
  active: Active
}

export default function Sidebar({ active }: Props) {
  const [email, setEmail] = useState<string>('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const links: { key: Active; label: string; icon: string; to: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊', to: '/dashboard' },
    { key: 'briefings', label: 'Briefings', icon: '📝', to: '/briefings' },
    { key: 'planos', label: 'Planos', icon: '💳', to: '/planos' },
    { key: 'settings', label: 'Configurações', icon: '⚙️', to: '/settings' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Radar<span>IA</span>
      </div>
      <nav className="sidebar-nav">
        {links.map((l) => (
          <Link
            key={l.key}
            to={l.to}
            className={`sidebar-link ${active === l.key ? 'active' : ''}`}
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-user">
        <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
          {email || '—'}
        </div>
        <button className="btn-ghost" onClick={handleSignOut} style={{ padding: '6px 0' }}>
          Sair
        </button>
      </div>
    </aside>
  )
}
