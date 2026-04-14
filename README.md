# RadarIA

RadarIA é um SaaS de inteligência competitiva para PMEs brasileiras. O cliente cadastra seus concorrentes e, todo domingo, recebe por WhatsApp e email um briefing semanal em português gerado por IA a partir de dados públicos coletados diariamente. Objetivo: transformar monitoramento manual em insights acionáveis sem esforço.

## Pré-requisitos

Crie contas (gratuitas ou com plano inicial) nos serviços abaixo antes de rodar o projeto:

- **GitHub** — https://github.com (repositório do código)
- **Supabase** — https://supabase.com (Postgres + Auth + Edge Functions)
- **Anthropic Console** — https://console.anthropic.com (Claude API, modelo `claude-sonnet-4-20250514`)
- **Resend** — https://resend.com (entrega de email transacional)
- **Evolution API** — https://doc.evolution-api.com (WhatsApp; auto-hospedado ou provider gerenciado)
- **Mercado Pago** — https://www.mercadopago.com.br/developers (checkout PIX + cartão)
- **Apify** — https://apify.com (actors e scheduler de coleta)
- **Vercel** — https://vercel.com (deploy do frontend)

Ferramentas locais:

- Node.js 20+ e npm
- Supabase CLI — https://supabase.com/docs/guides/cli
- Git

## Rodar localmente

```bash
# 1. Clonar
git clone https://github.com/luccavgiani-spec/RadarIA.git
cd RadarIA

# 2. Variáveis de ambiente
cp .env.example .env
# preencha .env com as credenciais de cada serviço

# 3. Frontend
cd frontend
npm install
npm run dev
# abre em http://localhost:5173

# 4. Banco de dados (Supabase)
cd ..
supabase login
supabase link --project-ref <seu-project-ref>
supabase db push    # aplica supabase/migrations/001_initial_schema.sql
```

## Deploy

**Frontend (Vercel):**
1. Conecte o repositório GitHub à Vercel.
2. Defina o root directory como `frontend/`.
3. Configure as variáveis `VITE_*` no painel da Vercel (mesmos valores do `.env`).
4. Deploy automático a cada push na branch principal.

**Banco de dados (Supabase):**
```bash
supabase db push
```

**Edge Functions (Supabase):**
```bash
supabase functions deploy collect-trigger
supabase functions deploy generate-briefing
supabase functions deploy deliver-briefing
supabase functions deploy mp-process-payment
supabase functions deploy mp-webhook
```

Configure os secrets de cada função via `supabase secrets set` (usa as mesmas chaves do `.env`, exceto as `VITE_*`, que são só do frontend).
