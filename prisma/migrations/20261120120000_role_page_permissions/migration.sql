ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE roles
SET permissions = '["overview","roles","client_users","admin_users","history","settings","settings.email","settings.api","settings.feature_flags"]'::jsonb
WHERE portal = 'admin'
  AND (permissions = '[]'::jsonb OR jsonb_array_length(permissions) = 0);

UPDATE roles
SET permissions = '["dashboard","deep_backend","access.users","access.roles","history","settings"]'::jsonb
WHERE key = 'super_admin'
  AND (permissions = '[]'::jsonb OR jsonb_array_length(permissions) = 0);

UPDATE roles
SET permissions = '["dashboard","deep_backend","settings"]'::jsonb
WHERE key = 'member'
  AND (permissions = '[]'::jsonb OR jsonb_array_length(permissions) = 0);