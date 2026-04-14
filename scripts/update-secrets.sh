#!/usr/bin/env bash
# scripts/update-secrets.sh
#
# Rodar após preencher todas as credenciais no .env local.
# Usa o Supabase CLI para setar os secrets do projeto.
#
# Pré-requisito: `supabase login` já executado (ou SUPABASE_ACCESS_TOKEN exportado).

set -euo pipefail

PROJECT_REF="jofebwsynxnzizxcmajn"
ENV_FILE="${ENV_FILE:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Arquivo $ENV_FILE não encontrado. Abortando."
  exit 1
fi

# Carrega variáveis do .env sem exportar para o shell
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "🔗 Linkando projeto $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

echo "🔐 Setando secrets no Supabase..."
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}" \
  CLAUDE_API_KEY="${CLAUDE_API_KEY:-}" \
  RESEND_API_KEY="${RESEND_API_KEY:-}" \
  RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-}" \
  EVOLUTION_URL="${EVOLUTION_URL:-}" \
  EVOLUTION_KEY="${EVOLUTION_KEY:-}" \
  EVOLUTION_INSTANCE="${EVOLUTION_INSTANCE:-}" \
  STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}" \
  STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}" \
  APIFY_WEBHOOK_SECRET="${APIFY_WEBHOOK_SECRET:-}" \
  APIFY_API_TOKEN="${APIFY_API_TOKEN:-}"

echo "✅ Secrets atualizados no Supabase"
