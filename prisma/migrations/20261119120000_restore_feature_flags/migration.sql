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

CREATE INDEX IF NOT EXISTS idx_client_ff_overrides_client ON client_feature_flag_overrides (client_user_id);

INSERT INTO feature_flags (key, label, description, nav_path, sort_order) VALUES
  ('client.account', 'Client portal', 'Default gate for dashboard, projects, deep backend, access, and history', '/dashboard', 5),
  ('client.settings', 'Settings', 'Client preferences', '/settings', 90)
ON CONFLICT (key) DO NOTHING;