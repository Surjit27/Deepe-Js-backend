import { countAuditEventsByDomain, listAuditEventsByDomain } from '../repositories/audit.repository.js'
import { parseHistoryListQuery } from '../utils/historyQuery.js'

function toPublic(row) {
  const metadata = row.metadata ?? {}
  return {
    id: row.id,
    domain: row.domain,
    occurredAt: row.created_at,
    event: row.action,
    resource: row.subject_label || row.subject_id || '',
    resourceId: row.subject_id,
    performedByUserId: row.actor_user_id,
    performedByLabel: metadata.performedByLabel ?? '',
    request: metadata.request ?? null,
    response: metadata.response ?? null,
    metadata,
  }
}

export async function listHistoryByDomain(domain, query = {}) {
  const parsed = parseHistoryListQuery(query, { mode: 'audit' })
  const [rows, total] = await Promise.all([
    listAuditEventsByDomain(domain, {
      limit: parsed.limit,
      offset: parsed.offset,
      sortSql: parsed.sortSql,
      order: parsed.order,
    }),
    countAuditEventsByDomain(domain),
  ])
  return {
    events: rows.map(toPublic),
    total,
    limit: parsed.limit,
    offset: parsed.offset,
    sort: parsed.sortKey,
    order: parsed.order === 'ASC' ? 'asc' : 'desc',
  }
}
