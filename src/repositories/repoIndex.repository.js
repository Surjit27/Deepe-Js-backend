import { getPostgresPool } from '../db/postgres.js'
import { clientSchemaName } from '../db/clientSchema/provision.js'

function schema(clientUserId) {
  return clientSchemaName(clientUserId)
}

export async function insertRepoIndexJob(clientUserId, connectedRepoId) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO ${schema(clientUserId)}.repo_index_jobs (connected_repo_id, status)
     VALUES ($1, 'queued')
     RETURNING id, connected_repo_id, status, created_at`,
    [connectedRepoId],
  )
  return rows[0]
}

export async function markRepoIndexJob(clientUserId, jobId, patch) {
  const { rows } = await getPostgresPool().query(
    `UPDATE ${schema(clientUserId)}.repo_index_jobs
     SET status = COALESCE($2, status),
         error = COALESCE($3, error),
         started_at = COALESCE($4, started_at),
         finished_at = COALESCE($5, finished_at)
     WHERE id = $1
     RETURNING *`,
    [jobId, patch.status ?? null, patch.error ?? null, patch.startedAt ?? null, patch.finishedAt ?? null],
  )
  return rows[0] ?? null
}

export async function upsertRepoCodeGraph(clientUserId, row) {
  const graph = JSON.stringify(row.graph ?? {})
  const { rows } = await getPostgresPool().query(
    `INSERT INTO ${schema(clientUserId)}.repo_code_graphs (
       connected_repo_id, branch, commit_sha, graph, file_count, symbol_count, indexed_at
     ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW())
     ON CONFLICT (connected_repo_id) DO UPDATE SET
       branch = EXCLUDED.branch,
       commit_sha = EXCLUDED.commit_sha,
       graph = EXCLUDED.graph,
       file_count = EXCLUDED.file_count,
       symbol_count = EXCLUDED.symbol_count,
       indexed_at = NOW()
     RETURNING connected_repo_id, branch, commit_sha, file_count, symbol_count, indexed_at`,
    [row.connectedRepoId, row.branch, row.commitSha, graph, row.fileCount, row.symbolCount],
  )
  return rows[0]
}

export async function findRepoCodeGraph(clientUserId, connectedRepoId) {
  const { rows } = await getPostgresPool().query(
    `SELECT connected_repo_id, branch, commit_sha, graph, file_count, symbol_count, indexed_at
     FROM ${schema(clientUserId)}.repo_code_graphs
     WHERE connected_repo_id = $1`,
    [connectedRepoId],
  )
  return rows[0] ?? null
}

export async function listRepoCodeGraphs(clientUserId, connectedRepoIds) {
  if (!connectedRepoIds?.length) return []
  const { rows } = await getPostgresPool().query(
    `SELECT connected_repo_id, branch, commit_sha, graph, file_count, symbol_count, indexed_at
     FROM ${schema(clientUserId)}.repo_code_graphs
     WHERE connected_repo_id = ANY($1::uuid[])`,
    [connectedRepoIds],
  )
  return rows
}
