// supabase/functions/deliver-briefing/index.ts
//
// Entrega o briefing via WhatsApp (Evolution API) e email (Resend),
// e marca os flags delivered_* no registro.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL")!;

const EVOLUTION_URL = Deno.env.get("EVOLUTION_URL")!;
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_KEY")!;
const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Converte Markdown → texto formatado para WhatsApp. */
function mdToWhatsApp(md: string): string {
  let t = md;
  // Remove headers (# ## ###)
  t = t.replace(/^#{1,6}\s+/gm, "");
  // **bold** → *bold* (WhatsApp)
  t = t.replace(/\*\*(.+?)\*\*/g, "*$1*");
  // __bold__ → *bold*
  t = t.replace(/__(.+?)__/g, "*$1*");
  // ~~strike~~ → ~strike~
  t = t.replace(/~~(.+?)~~/g, "~$1~");
  // `code` → mantém sem crase
  t = t.replace(/`([^`]+)`/g, "$1");
  // Links [texto](url) → texto (url)
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  // Bullets "- " ou "* " → "• "
  t = t.replace(/^[\-\*]\s+/gm, "• ");
  // Horizontal rule
  t = t.replace(/^---+$/gm, "");
  return t.trim();
}

/** Converte Markdown → HTML básico para email. */
function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{3}\s+/.test(line)) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3>${inline(line.replace(/^#{3}\s+/, ""))}</h3>`);
    } else if (/^##\s+/.test(line)) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h2>${inline(line.replace(/^##\s+/, ""))}</h2>`);
    } else if (/^#\s+/.test(line)) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h1>${inline(line.replace(/^#\s+/, ""))}</h1>`);
    } else if (/^[\-\*]\s+/.test(line)) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inline(line.replace(/^[\-\*]\s+/, ""))}</li>`);
    } else if (line === "") {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push("");
    } else {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  return html.join("\n");
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "method not allowed" });

    const { briefing_id } = await req.json();
    if (!briefing_id) return json(400, { error: "missing briefing_id" });

    // 1. Busca briefing + workspace
    const { data: briefing, error: briefErr } = await supabase
      .from("briefings")
      .select(
        "id, workspace_id, period_start, period_end, content_md, " +
          "workspaces(whatsapp_number, report_email, company_name)",
      )
      .eq("id", briefing_id)
      .single();
    if (briefErr || !briefing) {
      console.error("briefing lookup failed", briefErr);
      return json(404, { error: "briefing not found" });
    }

    // supabase-js embeds workspace as array or object dependendo da versão
    const ws = Array.isArray((briefing as any).workspaces)
      ? (briefing as any).workspaces[0]
      : (briefing as any).workspaces;

    const contentMd = (briefing as any).content_md as string;
    const periodStart = (briefing as any).period_start as string;

    let deliveredWhatsapp = false;
    let deliveredEmail = false;
    const errors: Record<string, string> = {};

    // 2. WhatsApp
    if (ws?.whatsapp_number) {
      try {
        const waText = mdToWhatsApp(contentMd);
        const waRes = await fetch(
          `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              apikey: EVOLUTION_KEY,
            },
            body: JSON.stringify({
              number: ws.whatsapp_number,
              text: waText,
            }),
          },
        );
        if (waRes.ok) {
          deliveredWhatsapp = true;
        } else {
          errors.whatsapp = `status ${waRes.status}: ${await waRes.text()}`;
        }
      } catch (err) {
        errors.whatsapp = String(err);
      }
    }

    // 3. Email (Resend)
    if (ws?.report_email) {
      try {
        const html = mdToHtml(contentMd);
        const subject = `📊 Seu briefing competitivo — semana de ${periodStart}`;
        const emRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: [ws.report_email],
            subject,
            html,
          }),
        });
        if (emRes.ok) {
          deliveredEmail = true;
        } else {
          errors.email = `status ${emRes.status}: ${await emRes.text()}`;
        }
      } catch (err) {
        errors.email = String(err);
      }
    }

    // 4. Atualiza flags
    await supabase
      .from("briefings")
      .update({
        delivered_whatsapp: deliveredWhatsapp,
        delivered_email: deliveredEmail,
      })
      .eq("id", briefing_id);

    return json(200, {
      briefing_id,
      delivered_whatsapp: deliveredWhatsapp,
      delivered_email: deliveredEmail,
      errors: Object.keys(errors).length ? errors : undefined,
    });
  } catch (err) {
    console.error("deliver-briefing unexpected error", err);
    return json(500, { error: "unexpected" });
  }
});
