import { getPostgresPool } from '../db/postgres.js'

const COLUMNS = `id, template_id, kind, subject, html_body, text_body, variables,
  from_email, from_name, recipient_email, sendgrid_message_id, actor_user_id, email_provider_id, created_at`

export async function insertEmailPreview(fields) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO email_previews (
      template_id, kind, subject, html_body, text_body, variables,
      from_email, from_name, recipient_email, sendgrid_message_id, actor_user_id, email_provider_id
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)
    RETURNING ${COLUMNS}`,
    [
      fields.templateId,
      fields.kind ?? 'preview',
      fields.subject ?? '',
      fields.htmlBody,
      fields.textBody ?? '',
      JSON.stringify(fields.variables ?? {}),
      fields.fromEmail ?? '',
      fields.fromName ?? '',
      fields.recipientEmail ?? '',
      fields.sendgridMessageId ?? '',
      fields.actorUserId ?? null,
      fields.emailProviderId ?? null,
    ],
  )
  return rows[0]
}

export async function getEmailPreviewById(id) {
  const { rows } = await getPostgresPool().query(`SELECT ${COLUMNS} FROM email_previews WHERE id = $1`, [id])
  return rows[0] ?? null
}

export async function updateEmailPreviewMessageId(id, messageId) {
  const { rows } = await getPostgresPool().query(
    `UPDATE email_previews SET sendgrid_message_id = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, messageId ?? ''],
  )
  return rows[0] ?? null
}

export async function listDistinctTestRecipientEmails(limit = 30, emailProviderId = null) {
  const capped = Math.min(Math.max(Number(limit) || 30, 1), 100)
  const params = emailProviderId ? [emailProviderId, capped] : [capped]
  const providerClause = emailProviderId ? 'AND email_provider_id = $1' : ''
  const limitParam = emailProviderId ? '$2' : '$1'
  const { rows } = await getPostgresPool().query(
    `SELECT recipient_email AS email, MAX(created_at) AS last_used
     FROM email_previews
     WHERE kind = 'sent'
       AND TRIM(recipient_email) <> ''
       AND TRIM(sendgrid_message_id) <> ''
       ${providerClause}
     GROUP BY recipient_email
     ORDER BY last_used DESC
     LIMIT ${limitParam}`,
    params,
  )
  return rows.map((r) => String(r.email).trim().toLowerCase())
}

export function toPublicPreview(row) {
  if (!row) return null
  return {
    id: row.id,
    templateId: row.template_id,
    kind: row.kind,
    subject: row.subject,
    html: row.html_body,
    text: row.text_body,
    variables: row.variables ?? {},
    from: { email: row.from_email, name: row.from_name },
    recipientEmail: row.recipient_email,
    sendgridMessageId: row.sendgrid_message_id,
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
  }
}