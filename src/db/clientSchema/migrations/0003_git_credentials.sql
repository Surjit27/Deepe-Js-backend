-- Git host credentials per tenant (private repo access via PAT / fine-grained token).

CREATE TABLE IF NOT EXISTS git_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(20) NOT NULL DEFAULT 'github',
  account_email VARCHAR(255) NOT NULL,
  label VARCHAR(120) NOT NULL DEFAULT '',
  token_cipher TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  last_github_login VARCHAR(120) NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_git_credentials_provider_email
  ON git_credentials (provider, lower(account_email));

CREATE INDEX IF NOT EXISTS idx_git_credentials_default ON git_credentials (is_default) WHERE is_default = true;
