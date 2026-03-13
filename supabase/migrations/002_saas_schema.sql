-- ============================================================
-- Migration 002: SaaS Cache Management Tables
-- ============================================================

-- Domains registered by users for cache management
CREATE TABLE IF NOT EXISTS user_domains (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain        TEXT NOT NULL,
  cloudflare_zone_id    TEXT,
  cloudflare_api_token  TEXT,         -- user's own CF token, zone-level
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_purged_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- Log of every cache purge action
CREATE TABLE IF NOT EXISTS cache_purge_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id     UUID NOT NULL REFERENCES user_domains(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purge_type    TEXT NOT NULL DEFAULT 'everything' CHECK (purge_type IN ('everything', 'urls')),
  urls_purged   TEXT[],               -- null when type = 'everything'
  cf_response   JSONB,
  success       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_domains_user_id ON user_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_cache_purge_history_domain_id ON cache_purge_history(domain_id);
CREATE INDEX IF NOT EXISTS idx_cache_purge_history_user_id ON cache_purge_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cache_purge_history_created_at ON cache_purge_history(created_at DESC);

-- ─── Auto-update updated_at ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_user_domains_updated_at
  BEFORE UPDATE ON user_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE user_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_purge_history ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own domains
CREATE POLICY "users own domains"
  ON user_domains FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only see their own purge history
CREATE POLICY "users own purge history"
  ON cache_purge_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
