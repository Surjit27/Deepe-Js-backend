-- Stored CodeMap-style graphs for Deep Explorer flow playground (per connected repo).

CREATE TABLE IF NOT EXISTS repo_index_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_repo_id UUID NOT NULL REFERENCES git_connected_repos (id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  error TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_index_jobs_repo_created
  ON repo_index_jobs (connected_repo_id, created_at DESC);

CREATE TABLE IF NOT EXISTS repo_code_graphs (
  connected_repo_id UUID PRIMARY KEY REFERENCES git_connected_repos (id) ON DELETE CASCADE,
  branch TEXT NOT NULL DEFAULT 'main',
  commit_sha TEXT NOT NULL DEFAULT '',
  graph JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_count INT NOT NULL DEFAULT 0,
  symbol_count INT NOT NULL DEFAULT 0,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
