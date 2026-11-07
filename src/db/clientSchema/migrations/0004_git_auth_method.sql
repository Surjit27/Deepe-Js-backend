-- PAT vs GitHub OAuth on the same git_credentials table.

ALTER TABLE git_credentials
  ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) NOT NULL DEFAULT 'pat',
  ADD COLUMN IF NOT EXISTS scopes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

UPDATE git_credentials SET auth_method = 'pat' WHERE auth_method IS NULL OR auth_method = '';
