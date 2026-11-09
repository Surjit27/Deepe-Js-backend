import { getPostgresPool } from '../db/postgres.js'
import { clientSchemaName } from '../db/clientSchema/provision.js'

const COLS = `id, git_credential_id, github_repo_id, full_name, name, default_branch, private,
  html_url, language, metadata, connected_at, updated_at`

function schema(clientUserId) {
  return clientSchemaName(clientUserId)
}

export async function findConnectedRepoById(clientUserId, id) {
  const { rows } = await getPostgresPool().query(
    `SELECT ${COLS}
     FROM ${schema(clientUserId)}.git_connected_repos
     WHERE id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function listConnectedRepos(clientUserId) {
  const { rows } = await getPostgresPool().query(
    `SELECT ${COLS}
     FROM ${schema(clientUserId)}.git_connected_repos
     ORDER BY connected_at DESC`,
  )
  return rows
}

export async function listConnectedRepoIdsForCredential(clientUserId, credentialId) {
  const { rows } = await getPostgresPool().query(
    `SELECT github_repo_id
     FROM ${schema(clientUserId)}.git_connected_repos
     WHERE git_credential_id = $1`,
    [credentialId],
  )
  return rows.map((r) => String(r.github_repo_id))
}

export async function upsertConnectedRepo(clientUserId, row) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO ${schema(clientUserId)}.git_connected_repos (
       git_credential_id, github_repo_id, full_name, name, default_branch, private, html_url, language, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     ON CONFLICT (git_credential_id, github_repo_id) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       name = EXCLUDED.name,
       default_branch = EXCLUDED.default_branch,
       private = EXCLUDED.private,
       html_url = EXCLUDED.html_url,
       language = EXCLUDED.language,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING ${COLS}`,
    [
      row.gitCredentialId,
      row.githubRepoId,
      row.fullName,
      row.name,
      row.defaultBranch,
      row.private,
      row.htmlUrl,
      row.language,
      JSON.stringify(row.metadata ?? {}),
    ],
  )
  return rows[0]
}

export async function deleteConnectedRepo(clientUserId, credentialId, githubRepoId) {
  const { rowCount } = await getPostgresPool().query(
    `DELETE FROM ${schema(clientUserId)}.git_connected_repos
     WHERE git_credential_id = $1 AND github_repo_id = $2`,
    [credentialId, githubRepoId],
  )
  return rowCount > 0
}
