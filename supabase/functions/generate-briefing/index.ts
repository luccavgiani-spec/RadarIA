// supabase/functions/generate-briefing/index.ts
//
// Gera o briefing executivo da semana via Claude API e dispara deliver-briefing.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

interface Snapshot {
  competitor_id: string;
  source: string;
  raw_data: Record<string, unknown>;
  collected_at: string;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Utilitário: disparar um Actor da Apify via API REST
async function triggerApifyActor(
  actorId: string,
  input: object,
  webhookUrl: string,
  webhookSecret: string,
): Promise<void> {
  const apifyToken = Deno.env.get("APIFY_API_TOKEN");
  if (!apifyToken) return; // silencioso — não quebrar o briefing se Apify não estiver configurado

  await fetch(
    `https://api.apify.com/v2/acts/${actorId.replace("/", "~")}/runs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apifyToken}`,
      },
      body: JSON.stringify({
        ...input,
        webhookUrl: webhookUrl,
        webhookHeaders: { "x-webhook-secret": webhookSecret },
      }),
    },
  );
}

/** Monta um bloco de texto por concorrente, comparando semana atual vs anterior. */
function buildContext(
  competitors: { id: string; name: string }[],
  current: Snapshot[],
  previous: Snapshot[],
): string {
  const byCompetitor = (snaps: Snapshot[]) => {
    const map = new Map<string, Snapshot[]>();
    for (const s of snaps) {
      const arr = map.get(s.competitor_id) ?? [];
      arr.push(s);
      map.set(s.competitor_id, arr);
    }
    return map;
  };

  const curMap = byCompetitor(current);
  const prevMap = byCompetitor(previous);

  const blocks: string[] = [];
  for (const c of competitors) {
    const cur = curMap.get(c.id) ?? [];
    const prev = prevMap.get(c.id) ?? [];

    const groupBySource = (arr: Snapshot[]) => {
      const g: Record<string, unknown[]> = {};
      for (const s of arr) {
        (g[s.source] ??= []).push(s.raw_data);
      }
      return g;
    };

    blocks.push(
      `## Concorrente: ${c.name}\n` +
        `### Semana atual\n${JSON.stringify(groupBySource(cur), null, 2)}\n` +
        `### Semana anterior\n${JSON.stringify(groupBySource(prev), null, 2)}`,
    );
  }

  return blocks.join("\n\n");
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "method not allowed" });

    const { workspace_id, period_start, period_end } = await req.json();
    if (!workspace_id || !period_start || !period_end) {
      return json(400, { error: "missing fields" });
    }

    // 1. Workspace
    const { data: workspace, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, company_name, segment")
      .eq("id", workspace_id)
      .single();
    if (wsErr || !workspace) return json(404, { error: "workspace not found" });

    // 2. Concorrentes ativos
    const { data: competitors, error: compErr } = await supabase
      .from("competitors")
      .select("id, name")
      .eq("workspace_id", workspace_id)
      .eq("active", true);
    if (compErr || !competitors || competitors.length === 0) {
      return json(400, { error: "no active competitors" });
    }
    const competitorIds = competitors.map((c) => c.id);

    // 3. Snapshots período atual
    const startISO = `${period_start}T00:00:00.000Z`;
    const endISO = `${period_end}T23:59:59.999Z`;

    const { data: currentSnaps, error: curErr } = await supabase
      .from("snapshots")
      .select("competitor_id, source, raw_data, collected_at")
      .in("competitor_id", competitorIds)
      .gte("collected_at", startISO)
      .lte("collected_at", endISO);
    if (curErr) return json(500, { error: "current snapshots query failed" });

    // 4. Snapshots período anterior (7 dias antes)
    const prevStart = new Date(period_start);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(period_end);
    prevEnd.setDate(prevEnd.getDate() - 7);

    const { data: previousSnaps, error: prevErr } = await supabase
      .from("snapshots")
      .select("competitor_id, source, raw_data, collected_at")
      .in("competitor_id", competitorIds)
      .gte("collected_at", prevStart.toISOString())
      .lte("collected_at", prevEnd.toISOString());
    if (prevErr) return json(500, { error: "previous snapshots query failed" });

    // 5. Contexto estruturado
    const dadosPorConcorrente = buildContext(
      competitors,
      (currentSnaps ?? []) as Snapshot[],
      (previousSnaps ?? []) as Snapshot[],
    );

    const systemPrompt =
      `Você é um analista de inteligência competitiva para PMEs brasileiras.\n` +
      `Empresa do cliente: ${workspace.company_name} | Segmento: ${workspace.segment ?? "—"}\n` +
      `Dados coletados de ${period_start} a ${period_end} comparados com a semana anterior:\n` +
      `${dadosPorConcorrente}\n\n` +
      `Gere um briefing executivo em português com:\n` +
      `1. Resumo da semana (máx 3 linhas)\n` +
      `2. Movimentos por concorrente — só o que mudou, bullets diretos\n` +
      `3. Oportunidade da semana — 1 insight acionável\n` +
      `4. Alerta — se algum concorrente acelerou algo preocupante\n\n` +
      `Tom: direto, como um sócio te atualizando no café. Sem jargão. Máx 400 palavras. Formato Markdown.`;

    // 6. Chama Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: "user", content: "Gere o briefing semanal conforme as instruções do system prompt." },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error("claude api failed", claudeRes.status, errBody);
      return json(502, { error: "claude api failed", detail: errBody });
    }

    const claudeJson = await claudeRes.json();
    const contentMd: string =
      claudeJson?.content?.[0]?.text ?? "Briefing indisponível.";

    // 7. Grava briefing
    const { data: briefing, error: insErr } = await supabase
      .from("briefings")
      .insert({
        workspace_id,
        period_start,
        period_end,
        content_md: contentMd,
      })
      .select("id")
      .single();
    if (insErr || !briefing) {
      console.error("briefing insert failed", insErr);
      return json(500, { error: "briefing insert failed" });
    }

    // 8. Dispara entrega
    const deliverUrl = `${SUPABASE_URL}/functions/v1/deliver-briefing`;
    fetch(deliverUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ briefing_id: briefing.id }),
    }).catch((err) => console.error("deliver-briefing dispatch failed", err));

    return json(200, { briefing_id: briefing.id });
  } catch (err) {
    console.error("generate-briefing unexpected error", err);
    return json(500, { error: "unexpected" });
  }
});
