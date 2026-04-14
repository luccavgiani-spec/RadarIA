#!/usr/bin/env bash
# scripts/deploy.sh
#
# Deploy completo do backend RadarIA no Supabase.
# Executa, em ordem, os passos 1, 2, 6, 7 e 8 do Prompt 6.
#
# Pré-requisitos:
# - Supabase CLI instalado (https://supabase.com/docs/guides/cli)
# - `supabase login` executado OU SUPABASE_ACCESS_TOKEN exportado
# - Arquivo .env na raiz do repo com os secrets (pode ter placeholders)

set -euo pipefail

PROJECT_REF="jofebwsynxnzizxcmajn"
ENV_FILE="${ENV_FILE:-.env}"
BASE_URL="https://${PROJECT_REF}.supabase.co/functions/v1"

if ! command -v supabase >/dev/null 2>&1; then
  echo "❌ Supabase CLI não encontrado. Instale em https://supabase.com/docs/guides/cli"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Arquivo $ENV_FILE não encontrado. Abortando."
  exit 1
fi

echo "🔗 [1/5] Linkando projeto $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

echo "🗄️  [2/5] Aplicando migrations (db push)..."
supabase db push

echo "🔐 [3/5] Setando secrets..."
bash "$(dirname "$0")/update-secrets.sh"

echo "🚀 [4/5] Deploy das Edge Functions..."

# Funções chamadas pela Apify e Stripe (sem JWT do Supabase)
supabase functions deploy collect-trigger --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt

# Funções chamadas internamente (sem JWT também — chamadas server-to-server)
supabase functions deploy generate-briefing --no-verify-jwt
supabase functions deploy deliver-briefing --no-verify-jwt

# Funções chamadas pelo frontend autenticado (verificam JWT normalmente)
supabase functions deploy stripe-checkout
supabase functions deploy stripe-cancel

echo "🧪 [5/5] Smoke tests contra as funções deployadas..."

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $label → $actual"
  else
    echo "  ❌ $label → esperado $expected, recebido $actual"
    FAILED=1
  fi
}

FAILED=0

# collect-trigger: deve retornar 401 sem webhook secret
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/collect-trigger" \
  -H "Content-Type: application/json" -d '{"test":true}')
check "collect-trigger (sem secret)" "401" "$CODE"

# stripe-webhook: deve retornar 400 sem signature
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/stripe-webhook" \
  -H "Content-Type: application/json" -d '{"type":"test"}')
check "stripe-webhook (sem signature)" "400" "$CODE"

# stripe-checkout: deve retornar 401 sem JWT
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/stripe-checkout" \
  -H "Content-Type: application/json" -d '{"test":true}')
check "stripe-checkout (sem JWT)" "401" "$CODE"

if [ "$FAILED" -eq 0 ]; then
  echo "🎉 Deploy concluído com sucesso."
else
  echo "⚠️  Deploy concluído, mas smoke tests falharam. Investigue acima."
  exit 1
fi
