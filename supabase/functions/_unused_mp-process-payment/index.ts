// supabase/functions/mp-process-payment/index.ts
//
// Processa pagamentos via Mercado Pago.
//
// REGRAS CRÍTICAS (battle-tested, NÃO alterar):
// - PIX → EXCLUSIVAMENTE Payments API /v1/payments. NUNCA Orders API.
// - Cartão → Orders API /v1/orders.
// - NUNCA incluir issuer_id no payload da Orders API (causa 400).
// - Sempre retornar HTTP 200, mesmo em erro de pagamento (status vai no body).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

interface Payer {
  email: string;
  first_name?: string;
  last_name?: string;
  identification?: { type?: string; number?: string };
}

interface Body {
  workspace_id: string;
  plan_id: string;
  payment_method_id: string;
  token?: string;
  installments?: number;
  transaction_amount: number;
  payer: Payer;
}

/** Mapeia status da Orders API → status interno de subscription. */
function mapOrderStatus(status: string, statusDetail?: string): string {
  if (status === "processed" && statusDetail === "accredited") return "paid";
  if (status === "cancelled" || status === "rejected") return "cancelled";
  return "pending";
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return ok({ error: "method not allowed" });

    const body = (await req.json()) as Body;
    const {
      workspace_id,
      plan_id,
      payment_method_id,
      token,
      installments,
      transaction_amount,
      payer,
    } = body;

    if (!workspace_id || !plan_id || !payment_method_id || !transaction_amount || !payer?.email) {
      return ok({ error: "missing fields" });
    }

    const isPix = payment_method_id === "pix";
    const now = Date.now();

    // ---------------- PIX: Payments API ----------------
    if (isPix) {
      const pixRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "X-Idempotency-Key": `${workspace_id}-pix-${now}`,
        },
        body: JSON.stringify({
          transaction_amount,
          payment_method_id: "pix",
          payer: { email: payer.email },
          external_reference: workspace_id,
        }),
      });

      const pixJson = await pixRes.json().catch(() => ({}));
      if (!pixRes.ok) {
        console.error("mp pix failed", pixRes.status, pixJson);
        return ok({ status: "error", detail: pixJson });
      }

      const mpPaymentId = String(pixJson.id ?? "");
      const qrCode = pixJson?.point_of_interaction?.transaction_data?.qr_code ?? null;
      const qrCodeBase64 =
        pixJson?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;

      await supabase.from("subscriptions").insert({
        workspace_id,
        plan_id,
        mp_payment_id: mpPaymentId,
        status: "pending",
        amount_brl: transaction_amount,
      });

      return ok({
        status: "pending",
        mp_payment_id: mpPaymentId,
        pix_qr_code: qrCode,
        pix_qr_code_base64: qrCodeBase64,
      });
    }

    // ---------------- Cartão: Orders API ----------------
    if (!token) return ok({ error: "missing card token" });

    // NOTA: NUNCA incluir issuer_id aqui — quebra a Orders API com 400.
    const orderPayload = {
      type: "online",
      processing_mode: "automatic",
      external_reference: workspace_id,
      total_amount: String(transaction_amount),
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification,
      },
      transactions: {
        payments: [
          {
            amount: String(transaction_amount),
            payment_method: {
              id: payment_method_id,
              type: "credit_card",
              token,
              installments: installments ?? 1,
            },
          },
        ],
      },
    };

    const orderRes = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key": `${workspace_id}-${now}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderJson = await orderRes.json().catch(() => ({}));
    if (!orderRes.ok) {
      console.error("mp order failed", orderRes.status, orderJson);
      return ok({ status: "error", detail: orderJson });
    }

    const mpOrderId = String(orderJson.id ?? "");
    const orderStatus = String(orderJson.status ?? "");
    const orderStatusDetail = String(orderJson.status_detail ?? "");
    const mapped = mapOrderStatus(orderStatus, orderStatusDetail);

    await supabase.from("subscriptions").insert({
      workspace_id,
      plan_id,
      mp_payment_id: mpOrderId,
      status: mapped,
      amount_brl: transaction_amount,
      paid_at: mapped === "paid" ? new Date().toISOString() : null,
    });

    if (mapped === "paid") {
      await supabase
        .from("workspaces")
        .update({ status: "active", plan_id })
        .eq("id", workspace_id);
    }

    return ok({
      status: mapped,
      mp_order_id: mpOrderId,
      mp_status: orderStatus,
      mp_status_detail: orderStatusDetail,
    });
  } catch (err) {
    console.error("mp-process-payment unexpected error", err);
    return ok({ status: "error", detail: String(err) });
  }
});
