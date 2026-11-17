const SORT = {
  occurredAt: { audit: 'created_at', client: 'created_at' },
  event: { audit: 'action', client: 'action' },
  resource: { audit: 'subject_label', client: 'subject_label' },
  performedBy: {
    audit: "LOWER(COALESCE(metadata->>'performedByLabel', actor_user_id::text, ''))",
    client: "LOWER(COALESCE(metadata->>'performedByLabel', ''))",
  },
}

export function parseHistoryListQuery(query = {}, { mode = 'audit' } = {}) {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 200)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const sortKey = typeof query.sort === 'string' && SORT[query.sort] ? query.sort : 'occurredAt'
  const order = query.order === 'asc' ? 'ASC' : 'DESC'
  const sortSql = SORT[sortKey][mode]
  return { limit, offset, sortKey, order, sortSql }
}