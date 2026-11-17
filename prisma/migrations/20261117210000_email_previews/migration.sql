CREATE TABLE IF NOT EXISTS email_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id VARCHAR(64) NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'preview',
  subject VARCHAR(255) NOT NULL DEFAULT '',
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL DEFAULT '',
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  from_email VARCHAR(255) NOT NULL DEFAULT '',
  from_name VARCHAR(255) NOT NULL DEFAULT '',
  recipient_email VARCHAR(255) NOT NULL DEFAULT '',
  sendgrid_message_id VARCHAR(255) NOT NULL DEFAULT '',
  actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_previews_created ON email_previews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_previews_actor ON email_previews (actor_user_id);