import { getPostgresPool } from '../db/postgres.js'

const COLUMNS = `id, provider, name, status, enabled, api_key_cipher, from_email, from_name, is_default, created_at, updated_at`

export async function listEmailProviders() {
  const { rows } = await getPostgresPool().query(
    `SELECT ${COLUMNS} FROM email_providers ORDER BY is_default DESC, updated_at DESC`,
  )
  return rows
}

export async function getEmailProviderById(id) {
  const { rows } = await getPostgresPool().query(`SELECT ${COLUMNS} FROM email_providers WHERE id = $1`, [id])
  return rows[0] ?? null
}

export async function getDefaultEmailProviderRow() {
  const { rows } = await getPostgresPool().query(
    `SELECT ${COLUMNS} FROM email_providers WHERE is_default = true ORDER BY updated_at DESC LIMIT 1`,
  )
  if (rows[0]) return rows[0]
  const fallback = await getPostgresPool().query(`SELECT ${COLUMNS} FROM email_providers ORDER BY created_at ASC LIMIT 1`)
  return fallback.rows[0] ?? null
}

export async function insertEmailProvider(fields) {
  if (fields.isDefault) {
    await getPostgresPool().query(`UPDATE email_providers SET is_default = false WHERE is_default = true`)
  }
  const { rows } = await getPostgresPool().query(
    `INSERT INTO email_providers (provider, name, status, enabled, api_key_cipher, from_email, from_name, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLUMNS}`,
    [
      fields.provider,
      fields.name,
      fields.status ?? 'inactive',
      Boolean(fields.enabled),
      fields.apiKeyCipher ?? '',
      fields.fromEmail ?? '',
      fields.fromName ?? '',
      Boolean(fields.isDefault),
    ],
  )
  return rows[0]
}

export async function updateEmailProvider(id, fields) {
  if (fields.isDefault === true) {
    await getPostgresPool().query(`UPDATE email_providers SET is_default = false WHERE is_default = true AND id <> $1`, [id])
  }
  const { rows } = await getPostgresPool().query(
    `UPDATE email_providers SET
      name = COALESCE($2, name),
      status = COALESCE($3, status),
      enabled = COALESCE($4, enabled),
      api_key_cipher = COALESCE($5, api_key_cipher),
      from_email = COALESCE($6, from_email),
      from_name = COALESCE($7, from_name),
      is_default = COALESCE($8, is_default),
      updated_at = NOW()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [
      id,
      fields.name ?? null,
      fields.status ?? null,
      fields.enabled ?? null,
      fields.apiKeyCipher ?? null,
      fields.fromEmail ?? null,
      fields.fromName ?? null,
      fields.isDefault ?? null,
    ],
  )
  return rows[0] ?? null
}

export async function deleteEmailProvider(id) {
  const { rowCount } = await getPostgresPool().query(`DELETE FROM email_providers WHERE id = $1`, [id])
  return rowCount > 0
}

export async function countEmailProviders() {
  const { rows } = await getPostgresPool().query(`SELECT COUNT(*)::int AS n FROM email_providers`)
  return rows[0]?.n ?? 0
}

/** Keep legacy singleton table in sync for older code paths. */
export async function syncEmailSettingsFromProvider(row) {
  if (!row) return
  await getPostgresPool().query(
    `UPDATE email_settings
     SET enabled = $1, api_key_cipher = $2, from_email = $3, from_name = $4, updated_at = NOW()
     WHERE id = true`,
    [row.enabled, row.api_key_cipher, row.from_email, row.from_name],
  )
}