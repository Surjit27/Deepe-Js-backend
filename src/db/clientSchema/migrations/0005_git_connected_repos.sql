-- Repos selected in GitHub inspect → surfaced in Backend Explorer "Connected backends".

CREATE TABLE IF NOT EXISTS git_connected_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  git_credential_id UUID NOT NULL REFERENCES git_credentials (id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  full_name TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  default_branch TEXT NOT NULL DEFAULT 'main',
  private BOOLEAN NOT NULL DEFAULT false,
  html_url TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (git_credential_id, github_repo_id)
);

CREATE INDEX IF NOT EXISTS idx_git_connected_repos_credential
  ON git_connected_repos (git_credential_id);
