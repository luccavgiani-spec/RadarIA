export interface Workspace {
  id: string
  user_id: string
  company_name: string
  segment: string | null
  plan_id: string | null
  status: 'trial' | 'active' | 'cancelled' | string
  trial_ends_at: string
  whatsapp_number: string | null
  report_email: string | null
  created_at: string
}

export interface Competitor {
  id: string
  workspace_id: string
  name: string
  website_url: string | null
  instagram_handle: string | null
  linkedin_url: string | null
  google_maps_place_id: string | null
  facebook_page: string | null
  active: boolean
  created_at: string
}

export interface Briefing {
  id: string
  workspace_id: string
  period_start: string
  period_end: string
  content_md: string
  delivered_whatsapp: boolean
  delivered_email: boolean
  created_at: string
}

export interface Plan {
  id: string
  name: 'starter' | 'pro' | string
  price_brl: number
  max_competitors: number
  created_at: string
}

export interface Subscription {
  id: string
  workspace_id: string
  plan_id: string | null
  mp_payment_id: string | null
  status: 'pending' | 'paid' | 'cancelled' | string
  amount_brl: number | null
  paid_at: string | null
  next_billing_at: string | null
  created_at: string
}
