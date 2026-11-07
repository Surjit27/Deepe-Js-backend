-- Per-client activity log (client portal History screens). Isolated per client_* schema.

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(20) NOT NULL,
  action VARCHAR(80) NOT NULL,
  subject_id VARCHAR(120) NOT NULL DEFAULT '',
  subject_label VARCHAR(255) NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_domain_created ON activity_events (domain, created_at DESC);
