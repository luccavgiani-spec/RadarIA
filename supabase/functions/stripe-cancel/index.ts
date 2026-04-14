import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const { workspace_id } = await req.json()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Buscar subscription_id
  const subRes = await fetch(
    `${supabaseUrl}/rest/v1/subscriptions?workspace_id=eq.${workspace_id}&status=eq.paid&select=stripe_subscription_id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  )
  const subs = await subRes.json()
  const stripeSubId = subs[0]?.stripe_subscription_id

  if (!stripeSubId) {
    return new Response(JSON.stringify({ error: 'Assinatura não encontrada' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Cancelar no Stripe ao final do período (não imediatamente)
  await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true })

  return new Response(JSON.stringify({ cancelled: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
