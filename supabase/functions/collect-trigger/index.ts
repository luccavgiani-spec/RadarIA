// supabase/functions/collect-trigger/index.ts
//
// Recebe webhook da Apify ao final de cada coleta de um concorrente.
// - Valida header x-webhook-secret
// - Insere snapshot
// - Se todos concorrentes ativos do workspace já têm snapshot de hoje
//   E hoje é domingo → dispara generate-briefing
//
// Retorna 200 sempre (erros não-críticos viram log) para evitar retentativas da Apify.

/**
 * APIFY ACTORS CONFIGURADOS PARA O RADARIA (low-cost, sem browser quando possível)
 *
 * website    → apify/website-content-crawler  (Cheerio-based, 8-16x mais barato que web-scraper)
 * instagram  → apify/instagram-scraper
 * meta_ads   → apify/facebook-ads-scraper
 * google_maps → compass/crawler-google-places
 * linkedin_jobs → curious_coder/linkedin-jobs-scraper
 *
 * Custo estimado por cliente/mês (3 concorrentes × 5 fontes × 30 dias):
 * ~$0.15-0.30/mês no plano Free ($5/mês) → suporta até ~15 clientes no free tier
 * ~$0.15-0.30/mês no Starter ($29/mês) → suporta até ~80 clientes confortavelmente
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APIFY_WEBHOOK_SECRET = Deno.env.get("APIFY_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Retorna a segunda-feira (00:00) da semana em que `date` cai, como string YYYY-MM-DD. */
function mondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom, 1=seg, ...
  const diff = day === 0 ? -6 : 1 - day; // se for domingo, volta 6 dias
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return ok({ ignored: true });

    const secret = req.headers.get("x-webhook-secret");
    if (secret !== APIFY_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const { competitor_id, source, raw_data } = await req.json();
    if (!competitor_id || !source || !raw_data) {
      return ok({ ignored: true, reason: "missing fields" });
    }

    // 1. Insere snapshot
    const { error: insertErr } = await supabase.from("snapshots").insert({
      competitor_id,
      source,
      raw_data,
    });
    if (insertErr) {
      console.error("snapshot insert failed", insertErr);
      return ok({ stored: false });
    }

    // 2. Descobre workspace do concorrente
    const { data: competitor, error: compErr } = await supabase
      .from("competitors")
      .select("workspace_id")
      .eq("id", competitor_id)
      .single();
    if (compErr || !competitor) {
      console.error("competitor lookup failed", compErr);
      return ok({ stored: true, briefing_triggered: false });
    }

    const workspaceId = competitor.workspace_id as string;

    // 3. Só dispara briefing no domingo
    if (new Date().getDay() !== 0) {
      return ok({ stored: true, briefing_triggered: false });
    }

    // 4. Conta concorrentes ativos e concorrentes com snapshot de hoje
    const { data: activeCompetitors, error: activeErr } = await supabase
      .from("competitors")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("active", true);
    if (activeErr || !activeCompetitors) {
      console.error("active competitors lookup failed", activeErr);
      return ok({ stored: true, briefing_triggered: false });
    }

    const todayStart = `${todayISO()}T00:00:00.000Z`;
    const todayEnd = `${todayISO()}T23:59:59.999Z`;

    const { data: snapsToday, error: snapErr } = await supabase
      .from("snapshots")
      .select("competitor_id")
      .in("competitor_id", activeCompetitors.map((c) => c.id))
      .gte("collected_at", todayStart)
      .lte("collected_at", todayEnd);
    if (snapErr) {
      console.error("today snapshots lookup failed", snapErr);
      return ok({ stored: true, briefing_triggered: false });
    }

    const withSnapshotToday = new Set((snapsToday ?? []).map((s) => s.competitor_id));
    const allCollected = activeCompetitors.every((c) => withSnapshotToday.has(c.id));

    if (!allCollected) {
      return ok({ stored: true, briefing_triggered: false });
    }

    // 5. Dispara generate-briefing (fire-and-forget)
    const periodStart = mondayOfWeek(new Date());
    const periodEnd = todayISO();

    const genUrl = `${SUPABASE_URL}/functions/v1/generate-briefing`;
    fetch(genUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        workspace_id: workspaceId,
        period_start: periodStart,
        period_end: periodEnd,
      }),
    }).catch((err) => console.error("generate-briefing dispatch failed", err));

    return ok({ stored: true, briefing_triggered: true });
  } catch (err) {
    console.error("collect-trigger unexpected error", err);
    return ok({ error: "handled" });
  }
});
