-- Client workspace access roles (separate from portal role admin|client on JWT).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_role_key VARCHAR(40) NOT NULL DEFAULT 'super_admin',
  ADD COLUMN IF NOT EXISTS tenant_owner_id UUID;

UPDATE users SET tenant_owner_id = id WHERE role = 'client' AND tenant_owner_id IS NULL;

INSERT INTO roles (key, label, portal) VALUES
  ('super_admin', 'Super admin', 'client'),
  ('member', 'Member', 'client')
ON CONFLICT (key) DO NOTHING;
