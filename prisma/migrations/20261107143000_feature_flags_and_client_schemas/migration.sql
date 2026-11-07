CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR(64) PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  nav_path VARCHAR(120) NOT NULL DEFAULT '',
  default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_feature_flag_overrides (
  client_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  flag_key VARCHAR(64) NOT NULL REFERENCES feature_flags (key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_user_id, flag_key)
);

CREATE TABLE IF NOT EXISTS client_schema_registry (
  client_user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  schema_name VARCHAR(80) NOT NULL UNIQUE,
  migration_version VARCHAR(32) NOT NULL DEFAULT '0001',
  provisioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_ff_overrides_client ON client_feature_flag_overrides (client_user_id);

INSERT INTO feature_flags (key, label, description, nav_path, sort_order) VALUES
  ('client.mocks', 'Mock servers', 'Client mock HTTP servers', '/mocks', 10),
  ('client.scheduler', 'Event scheduler', 'Scheduled API triggers', '/scheduler', 20),
  ('client.injection', 'Data injection', 'Bulk data injection runs', '/injection', 30),
  ('client.monitor', 'Execution monitor', 'Run history and status', '/monitor', 40),
  ('client.git', 'Git integration', 'Repository linking', '/git', 50),
  ('client.assistant', 'AI assistant', 'In-app assistant', '/assistant', 60),
  ('client.backends', 'Other backends', 'Additional backend workspaces', '/backends/auth', 70),
  ('client.account', 'Account', 'Profile and account', '/account', 80),
  ('client.settings', 'Settings', 'Client preferences', '/settings', 90)
ON CONFLICT (key) DO NOTHING;
