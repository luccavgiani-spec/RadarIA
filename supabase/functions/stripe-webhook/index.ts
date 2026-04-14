import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return new Response(`Webhook signature inválida: ${message}`, { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const updateWorkspace = async (workspaceId: string, status: string, planName?: string) => {
    const patch: Record<string, unknown> = { status }

    if (planName) {
      const planRes = await fetch(
        `${supabaseUrl}/rest/v1/plans?name=eq.${planName}&select=id`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      )
      const plans = await planRes.json()
      if (plans[0]) patch.plan_id = plans[0].id
    }

    await fetch(`${supabaseUrl}/rest/v1/workspaces?id=eq.${workspaceId}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
    })
  }

  const upsertSubscription = async (data: Record<string, unknown>) => {
    await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(data),
    })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const workspaceId = session.metadata?.workspace_id
      const planName = session.metadata?.plan_name
      if (!workspaceId) break

      await updateWorkspace(workspaceId, 'active', planName)
      await upsertSubscription({
        workspace_id: workspaceId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = (invoice as unknown as { subscription: string }).subscription
      const periodEndUnix =
        (invoice as unknown as { lines?: { data?: Array<{ period?: { end?: number } }> } })
          .lines?.data?.[0]?.period?.end
      const periodEnd = periodEndUnix
        ? new Date(periodEndUnix * 1000).toISOString()
        : null

      await fetch(
        `${supabaseUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            status: 'paid',
            paid_at: new Date().toISOString(),
            current_period_end: periodEnd,
          }),
        },
      )
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const workspaceId = sub.metadata?.workspace_id
      if (!workspaceId) break

      await updateWorkspace(workspaceId, 'cancelled')
      await fetch(
        `${supabaseUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${sub.id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ status: 'cancelled' }),
        },
      )
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
