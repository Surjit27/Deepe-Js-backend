CREATE TABLE IF NOT EXISTS email_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  enabled BOOLEAN NOT NULL DEFAULT false,
  api_key_cipher TEXT NOT NULL DEFAULT '',
  from_email VARCHAR(255) NOT NULL DEFAULT '',
  from_name VARCHAR(255) NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_providers_provider ON email_providers (provider);

ALTER TABLE email_previews
  ADD COLUMN IF NOT EXISTS email_provider_id UUID;

CREATE INDEX IF NOT EXISTS idx_email_previews_provider ON email_previews (email_provider_id);

INSERT INTO email_providers (provider, name, status, enabled, api_key_cipher, from_email, from_name, is_default)
SELECT
  'sendgrid',
  'SendGrid',
  CASE WHEN es.enabled THEN 'active' ELSE 'inactive' END,
  es.enabled,
  es.api_key_cipher,
  es.from_email,
  es.from_name,
  true
FROM email_settings es
WHERE es.id = true
  AND NOT EXISTS (SELECT 1 FROM email_providers LIMIT 1);