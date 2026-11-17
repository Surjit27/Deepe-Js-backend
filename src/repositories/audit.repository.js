import { getPostgresPool } from '../db/postgres.js'

const DOMAINS = new Set(['user', 'email', 'job'])

/**
 * @typedef {object} AuditInsert
 * @property {'user'|'email'|'job'} domain
 * @property {string} action
 * @property {string|null|undefined} [actorUserId]
 * @property {string|null|undefined} [subjectId]
 * @property {string} [subjectLabel]
 * @property {Record<string, unknown>} [metadata]
 */

export async function insertAuditEvent({
  domain,
  action,
  actorUserId = null,
  subjectId = null,
  subjectLabel = '',
  metadata = {},
}) {
  if (!DOMAINS.has(domain)) {
    throw new Error(`Invalid audit domain: ${domain}`)
  }
  const meta = JSON.stringify(metadata ?? {})
  const { rows } = await getPostgresPool().query(
    `INSERT INTO audit_events (domain, action, actor_user_id, subject_id, subject_label, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, domain, action, actor_user_id, subject_id, subject_label, metadata, created_at`,
    [domain, String(action).slice(0, 80), actorUserId || null, subjectId || null, String(subjectLabel).slice(0, 255), meta],
  )
  return rows[0]
}

export async function countAuditEventsByDomain(domain) {
  if (!DOMAINS.has(domain)) {
    throw new Error(`Invalid audit domain: ${domain}`)
  }
  const { rows } = await getPostgresPool().query(
    `SELECT COUNT(*)::int AS count FROM audit_events WHERE domain = $1`,
    [domain],
  )
  return rows[0]?.count ?? 0
}

export async function listAuditEventsByDomain(
  domain,
  { limit = 100, offset = 0, sortSql = 'created_at', order = 'DESC' } = {},
) {
  if (!DOMAINS.has(domain)) {
    throw new Error(`Invalid audit domain: ${domain}`)
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200)
  const safeOffset = Math.max(Number(offset) || 0, 0)
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC'
  const { rows } = await getPostgresPool().query(
    `SELECT id, domain, action, actor_user_id, subject_id, subject_label, metadata, created_at
     FROM audit_events
     WHERE domain = $1
     ORDER BY ${sortSql} ${safeOrder} NULLS LAST, created_at DESC
     LIMIT $2 OFFSET $3`,
    [domain, safeLimit, safeOffset],
  )
  return rows
}
