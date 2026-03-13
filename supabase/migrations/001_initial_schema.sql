-- ============================================================
-- Luzerge.com Initial Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- LEADS TABLE
-- Captures contact form submissions from the website
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email         TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone         TEXT,
  company       TEXT,
  service       TEXT CHECK (service IN ('starter', 'business', 'ecommerce', 'custom', 'other')),
  message       TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  source        TEXT DEFAULT 'website',  -- website, facebook, referral, etc.
  ip_address    INET,
  user_agent    TEXT,
  status        TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTACTS TABLE
-- Approved/converted clients
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  company       TEXT,
  plan          TEXT CHECK (plan IN ('starter', 'business', 'ecommerce', 'custom')),
  mrr           NUMERIC(10, 2) DEFAULT 0,    -- Monthly Recurring Revenue in PHP
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'churned')),
  start_date    DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS EVENTS TABLE
-- Lightweight custom analytics (Cloudflare-privacy-safe)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    TEXT NOT NULL,  -- page_view, cta_click, form_start, form_submit
  page_path     TEXT,
  referrer      TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  country       TEXT,
  city          TEXT,
  session_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SITE PAGES TABLE
-- CMS-lite for managing page content
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_pages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  meta_desc     TEXT,
  content       JSONB DEFAULT '{}',
  published     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pages
INSERT INTO public.site_pages (slug, title, meta_desc, published) VALUES
  ('home',      'Luzerge — Fast Websites for Cebu Businesses', 'Professional CDN-powered websites for Cebu SMEs. Sub-200ms load times, SSL included.', true),
  ('about',     'About Luzerge', 'Cebu-based web services startup using modern CDN technology.', true),
  ('services',  'Our Services', 'Web design, CDN setup, and digital marketing for Cebu businesses.', true),
  ('contact',   'Contact Us', 'Get in touch with Luzerge for a free website audit.', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CACHE_LOG TABLE
-- Track CDN cache purges for audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cache_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action        TEXT NOT NULL,  -- purge_all, purge_url, purge_tag
  target        TEXT,
  triggered_by  TEXT,          -- github_action, manual, deploy
  cf_result     JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_email       ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status      ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event   ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email    ON public.contacts(email);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_site_pages_updated_at
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_pages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_log         ENABLE ROW LEVEL SECURITY;

-- Public (anon) can INSERT leads (contact form submissions)
CREATE POLICY "anon_insert_leads"
  ON public.leads FOR INSERT TO anon
  WITH CHECK (true);

-- Public can INSERT analytics events (lightweight tracking)
CREATE POLICY "anon_insert_analytics"
  ON public.analytics_events FOR INSERT TO anon
  WITH CHECK (true);

-- Public can READ published site pages
CREATE POLICY "anon_read_published_pages"
  ON public.site_pages FOR SELECT TO anon
  USING (published = true);

-- Service role (server-side) has full access
CREATE POLICY "service_role_all_leads"
  ON public.leads FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_contacts"
  ON public.contacts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_analytics"
  ON public.analytics_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_pages"
  ON public.site_pages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_cache_log"
  ON public.cache_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);
