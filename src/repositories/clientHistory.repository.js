import { getPostgresPool } from '../db/postgres.js'
import { clientSchemaName } from '../db/clientSchema/provision.js'

const DOMAINS = new Set(['user', 'email', 'job'])

function assertDomain(domain) {
  if (!DOMAINS.has(domain)) throw new Error(`Invalid activity domain: ${domain}`)
}

export async function insertClientActivityEvent(clientUserId, { domain, action, subjectId = '', subjectLabel = '', metadata = {} }) {
  assertDomain(domain)
  const schema = clientSchemaName(clientUserId)
  const meta = JSON.stringify(metadata ?? {})
  const { rows } = await getPostgresPool().query(
    `INSERT INTO ${schema}.activity_events (domain, action, subject_id, subject_label, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, domain, action, subject_id, subject_label, metadata, created_at`,
    [domain, String(action).slice(0, 80), String(subjectId).slice(0, 120), String(subjectLabel).slice(0, 255), meta],
  )
  return rows[0]
}

export async function listClientActivityByDomain(clientUserId, domain, { limit = 100, offset = 0 } = {}) {
  assertDomain(domain)
  const schema = clientSchemaName(clientUserId)
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200)
  const safeOffset = Math.max(Number(offset) || 0, 0)
  const { rows } = await getPostgresPool().query(
    `SELECT id, domain, action, subject_id, subject_label, metadata, created_at
     FROM ${schema}.activity_events
     WHERE domain = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [domain, safeLimit, safeOffset],
  )
  return rows
}
