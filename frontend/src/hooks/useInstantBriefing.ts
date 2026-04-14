import { useCallback, useState } from 'react'

export type InstantBriefingStatus =
  | 'idle'
  | 'collecting'
  | 'generating'
  | 'delivering'
  | 'success'
  | 'error'

interface TriggerArgs {
  workspaceId: string
}

interface DeliveryWarning {
  whatsapp: boolean
  email: boolean
}

interface TriggerResult {
  briefingId: string
  warning?: DeliveryWarning
}

interface UseInstantBriefingResult {
  trigger: (args: TriggerArgs) => Promise<TriggerResult | null>
  status: InstantBriefingStatus
  error: string | null
  reset: () => void
}

export function useInstantBriefing(): UseInstantBriefingResult {
  const [status, setStatus] = useState<InstantBriefingStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  const trigger = useCallback(
    async ({ workspaceId }: TriggerArgs): Promise<TriggerResult | null> => {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      }

      setError(null)

      async function callFn<T>(path: string, body: unknown): Promise<T> {
        const res = await fetch(`${baseUrl}/functions/v1/${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || (json && (json as { error?: unknown }).error)) {
          const message =
            (json as { error?: string })?.error ?? `Falha em ${path} (${res.status})`
          throw new Error(message)
        }
        return json as T
      }

      try {
        // Step 1 — collect (may take 30-60s)
        setStatus('collecting')
        await callFn<{
          collected: number
          errors: unknown
          date: string
          competitors: number
        }>('collect-agent', { workspace_id: workspaceId })

        // Step 2 — generate (may take 30-60s)
        setStatus('generating')
        const today = new Date()
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const toIso = (d: Date) => d.toISOString().slice(0, 10)
        const gen = await callFn<{ briefing_id: string }>('generate-briefing', {
          workspace_id: workspaceId,
          period_start: toIso(weekAgo),
          period_end: toIso(today),
        })

        // Step 3 — deliver
        setStatus('delivering')
        const del = await callFn<{
          delivered_whatsapp: boolean
          delivered_email: boolean
          errors?: unknown
        }>('deliver-briefing', { briefing_id: gen.briefing_id })

        setStatus('success')
        const warning: DeliveryWarning | undefined =
          !del.delivered_whatsapp || !del.delivered_email
            ? { whatsapp: del.delivered_whatsapp, email: del.delivered_email }
            : undefined
        return { briefingId: gen.briefing_id, warning }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro desconhecido')
        setStatus('error')
        return null
      }
    },
    [],
  )

  return { trigger, status, error, reset }
}
