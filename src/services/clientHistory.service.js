import { migrateClientSchemaIfNeeded } from '../db/clientSchema/provision.js'
import {
  countClientActivityByDomain,
  insertClientActivityEvent,
  listClientActivityByDomain,
} from '../repositories/clientHistory.repository.js'
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
    performedByUserId: metadata.performedByUserId ?? null,
    performedByLabel: metadata.performedByLabel ?? '',
    request: metadata.request ?? null,
    response: metadata.response ?? null,
    previewId: metadata.previewId ?? null,
    templateId: metadata.templateId ?? null,
    emailSubject: metadata.subject ?? null,
    metadata,
  }
}

export async function ensureClientSchemaReady(clientUserId) {
  await migrateClientSchemaIfNeeded(clientUserId)
}

export async function listClientHistory(clientUserId, domain, query = {}) {
  await ensureClientSchemaReady(clientUserId)
  const parsed = parseHistoryListQuery(query, { mode: 'client' })
  const [rows, total] = await Promise.all([
    listClientActivityByDomain(clientUserId, domain, {
      limit: parsed.limit,
      offset: parsed.offset,
      sortSql: parsed.sortSql,
      order: parsed.order,
    }),
    countClientActivityByDomain(clientUserId, domain),
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

export async function recordClientActivity(clientUserId, event) {
  await ensureClientSchemaReady(clientUserId)
  return insertClientActivityEvent(clientUserId, event)
}
