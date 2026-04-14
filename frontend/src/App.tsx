import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Briefings from './pages/Briefings'
import Planos from './pages/Planos'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/briefings" element={<Briefings />} />
      <Route path="/planos" element={<Planos />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}
