create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_brl numeric not null,
  max_competitors int not null,
  created_at timestamptz default now()
);

insert into plans (name, price_brl, max_competitors) values
  ('starter', 197.00, 3),
  ('pro', 497.00, 8);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  company_name text not null,
  segment text,
  plan_id uuid references plans,
  status text default 'trial',
  trial_ends_at timestamptz default (now() + interval '7 days'),
  whatsapp_number text,
  report_email text,
  created_at timestamptz default now()
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  name text not null,
  website_url text,
  instagram_handle text,
  linkedin_url text,
  google_maps_place_id text,
  facebook_page text,
  active boolean default true,
  created_at timestamptz default now()
);

create table snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid references competitors on delete cascade,
  source text not null,
  raw_data jsonb not null,
  collected_at timestamptz default now()
);

create table briefings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  period_start date not null,
  period_end date not null,
  content_md text not null,
  delivered_whatsapp boolean default false,
  delivered_email boolean default false,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  plan_id uuid references plans,
  mp_payment_id text,
  status text default 'pending',
  amount_brl numeric,
  paid_at timestamptz,
  next_billing_at timestamptz,
  created_at timestamptz default now()
);

alter table workspaces enable row level security;
alter table competitors enable row level security;
alter table briefings enable row level security;
alter table subscriptions enable row level security;

create policy "workspace próprio" on workspaces
  for all using (user_id = auth.uid());

create policy "competitors do workspace próprio" on competitors
  for all using (
    workspace_id in (select id from workspaces where user_id = auth.uid())
  );

create policy "briefings do workspace próprio" on briefings
  for all using (
    workspace_id in (select id from workspaces where user_id = auth.uid())
  );

create policy "subscriptions do workspace próprio" on subscriptions
  for all using (
    workspace_id in (select id from workspaces where user_id = auth.uid())
  );
