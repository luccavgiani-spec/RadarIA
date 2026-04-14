import ReactMarkdown from 'react-markdown'
import { Briefing } from '../lib/types'

interface Props {
  briefing: Briefing
  onClose: () => void
}

export default function BriefingModal({ briefing, onClose }: Props) {
  const period = `${formatDate(briefing.period_start)} → ${formatDate(briefing.period_end)}`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>Briefing da semana</h3>
            <div className="text-muted" style={{ fontSize: 14 }}>
              {period}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="markdown">
          <ReactMarkdown>{briefing.content_md}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
