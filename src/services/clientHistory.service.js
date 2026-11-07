import { migrateClientSchemaIfNeeded } from '../db/clientSchema/provision.js'
import { insertClientActivityEvent, listClientActivityByDomain } from '../repositories/clientHistory.repository.js'

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
    metadata,
  }
}

export async function ensureClientSchemaReady(clientUserId) {
  await migrateClientSchemaIfNeeded(clientUserId)
}

export async function listClientHistory(clientUserId, domain, query = {}) {
  await ensureClientSchemaReady(clientUserId)
  const rows = await listClientActivityByDomain(clientUserId, domain, {
    limit: query.limit,
    offset: query.offset,
  })
  return { events: rows.map(toPublic) }
}

export async function recordClientActivity(clientUserId, event) {
  await ensureClientSchemaReady(clientUserId)
  return insertClientActivityEvent(clientUserId, event)
}
