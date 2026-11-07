import { getPostgresPool } from '../db/postgres.js'
import { clientSchemaName } from '../db/clientSchema/provision.js'

function schema(clientUserId) {
  return clientSchemaName(clientUserId)
}

export async function listGitCredentials(clientUserId) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, provider, account_email, label, token_cipher, is_default, last_verified_at,
            last_github_login, metadata, created_at, updated_at
     FROM ${schema(clientUserId)}.git_credentials
     ORDER BY is_default DESC, created_at ASC`,
  )
  return rows
}

export async function findGitCredentialById(clientUserId, id) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, provider, account_email, label, token_cipher, is_default, last_verified_at,
            last_github_login, metadata, created_at, updated_at
     FROM ${schema(clientUserId)}.git_credentials
     WHERE id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function findDefaultGitCredential(clientUserId) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, provider, account_email, label, token_cipher, is_default, last_verified_at,
            last_github_login, metadata, created_at, updated_at
     FROM ${schema(clientUserId)}.git_credentials
     WHERE is_default = true
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
  return rows[0] ?? null
}

export async function insertGitCredential(clientUserId, row) {
  if (row.isDefault) {
    await getPostgresPool().query(`UPDATE ${schema(clientUserId)}.git_credentials SET is_default = false WHERE is_default = true`)
  }
  const { rows } = await getPostgresPool().query(
    `INSERT INTO ${schema(clientUserId)}.git_credentials
       (provider, account_email, label, token_cipher, is_default, last_github_login, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id, provider, account_email, label, is_default, last_verified_at, last_github_login, metadata, created_at, updated_at`,
    [
      row.provider ?? 'github',
      row.accountEmail.toLowerCase(),
      row.label ?? '',
      row.tokenCipher ?? '',
      Boolean(row.isDefault),
      row.lastGithubLogin ?? '',
      JSON.stringify(row.metadata ?? {}),
    ],
  )
  return rows[0]
}

export async function updateGitCredential(clientUserId, id, patch) {
  if (patch.isDefault) {
    await getPostgresPool().query(`UPDATE ${schema(clientUserId)}.git_credentials SET is_default = false WHERE is_default = true AND id <> $1`, [
      id,
    ])
  }
  const { rows } = await getPostgresPool().query(
    `UPDATE ${schema(clientUserId)}.git_credentials
     SET account_email = COALESCE($2, account_email),
         label = COALESCE($3, label),
         token_cipher = COALESCE($4, token_cipher),
         is_default = COALESCE($5, is_default),
         last_verified_at = COALESCE($6, last_verified_at),
         last_github_login = COALESCE($7, last_github_login),
         metadata = COALESCE($8::jsonb, metadata),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, provider, account_email, label, is_default, last_verified_at, last_github_login, metadata, created_at, updated_at`,
    [
      id,
      patch.accountEmail?.toLowerCase() ?? null,
      patch.label ?? null,
      patch.tokenCipher ?? null,
      patch.isDefault == null ? null : Boolean(patch.isDefault),
      patch.lastVerifiedAt ?? null,
      patch.lastGithubLogin ?? null,
      patch.metadata == null ? null : JSON.stringify(patch.metadata),
    ],
  )
  return rows[0] ?? null
}

export async function deleteGitCredential(clientUserId, id) {
  const { rowCount } = await getPostgresPool().query(`DELETE FROM ${schema(clientUserId)}.git_credentials WHERE id = $1`, [id])
  return rowCount > 0
}
