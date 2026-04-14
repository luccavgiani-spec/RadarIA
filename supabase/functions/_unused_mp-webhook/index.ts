// supabase/functions/mp-webhook/index.ts
//
// Recebe notificações (webhook) do Mercado Pago e atualiza subscriptions/workspaces.
// Retorna HTTP 200 sempre — MP retenta em 5xx, e IDs de teste costumam dar 404 na consulta.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function ok(body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function mapStatus(status: string, statusDetail?: string): string {
  if (status === "approved" || (status === "processed" && statusDetail === "accredited")) {
    return "paid";
  }
  if (status === "cancelled" || status === "rejected" || status === "refunded") {
    return "cancelled";
  }
  return "pending";
}

async function fetchFromMP(url: string) {
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  return res;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return ok({ ignored: true });

    const body = await req.json().catch(() => ({}));
    // MP manda { action, type, data: { id } } ou payloads similares
    const id = body?.data?.id ?? body?.id ?? null;
    const type: string = body?.type ?? body?.topic ?? "";

    if (!id) return ok({ ignored: true, reason: "no id" });

    // Tenta consultar Payments API primeiro; se for order, cai no /v1/orders
    let entity: Record<string, any> | null = null;
    let entityKind: "payment" | "order" | null = null;

    if (type.includes("order") || type === "topic_merchant_order_wh") {
      const res = await fetchFromMP(`https://api.mercadopago.com/v1/orders/${id}`);
      if (res.status === 404) return ok({ ignored: true, reason: "order 404" });
      if (res.ok) {
        entity = await res.json();
        entityKind = "order";
      }
    } else {
      // default: payment
      const res = await fetchFromMP(`https://api.mercadopago.com/v1/payments/${id}`);
      if (res.status === 404) {
        // Fallback: tenta orders
        const orderRes = await fetchFromMP(`https://api.mercadopago.com/v1/orders/${id}`);
        if (orderRes.status === 404) return ok({ ignored: true, reason: "payment+order 404" });
        if (orderRes.ok) {
          entity = await orderRes.json();
          entityKind = "order";
        }
      } else if (res.ok) {
        entity = await res.json();
        entityKind = "payment";
      }
    }

    if (!entity || !entityKind) {
      return ok({ ignored: true, reason: "mp fetch failed" });
    }

    const mpId = String(entity.id ?? id);
    const rawStatus = String(entity.status ?? "");
    const statusDetail = String(entity.status_detail ?? "");
    const mapped = mapStatus(rawStatus, statusDetail);
    const externalRef: string | null = entity.external_reference ?? null;

    // Atualiza subscriptions — chave por mp_payment_id (cobre payment e order)
    const patch: Record<string, unknown> = { status: mapped };
    if (mapped === "paid") patch.paid_at = new Date().toISOString();

    const { data: updatedSubs, error: updErr } = await supabase
      .from("subscriptions")
      .update(patch)
      .eq("mp_payment_id", mpId)
      .select("id, workspace_id, plan_id");

    if (updErr) {
      console.error("subscription update failed", updErr);
      return ok({ handled: false });
    }

    // Se o status for paid, ativa workspace
    if (mapped === "paid") {
      const sub = updatedSubs?.[0];
      const workspaceId = sub?.workspace_id ?? externalRef;
      const planId = sub?.plan_id;
      if (workspaceId) {
        const wsPatch: Record<string, unknown> = { status: "active" };
        if (planId) wsPatch.plan_id = planId;
        await supabase.from("workspaces").update(wsPatch).eq("id", workspaceId);
      }
    }

    return ok({
      handled: true,
      mp_id: mpId,
      kind: entityKind,
      status: mapped,
    });
  } catch (err) {
    console.error("mp-webhook unexpected error", err);
    return ok({ handled: false, error: "unexpected" });
  }
});
