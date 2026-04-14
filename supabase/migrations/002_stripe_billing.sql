-- Remover coluna mp_payment_id e adicionar campos Stripe
alter table subscriptions
  drop column if exists mp_payment_id,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists current_period_end timestamptz;

-- Atualizar tabela de planos com price IDs do Stripe
alter table plans
  add column if not exists stripe_price_id_monthly text;

-- Comentário: popular stripe_price_id_monthly após criar produtos no Stripe dashboard
-- Starter: price_xxxx | Pro: price_yyyy
