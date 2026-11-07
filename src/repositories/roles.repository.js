import { getPostgresPool } from '../db/postgres.js'

export async function listRoles() {
  const { rows } = await getPostgresPool().query(
    `SELECT id, key, label, portal, created_at FROM roles ORDER BY created_at ASC`,
  )
  return rows
}

export async function listRolesByPortal(portal) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, key, label, portal, created_at FROM roles WHERE portal = $1 ORDER BY created_at ASC`,
    [portal],
  )
  return rows
}

export async function findRoleByKey(key) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, key, label, portal, created_at FROM roles WHERE key = $1`,
    [key],
  )
  return rows[0] ?? null
}

export async function createRole({ key, label, portal }) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO roles (key, label, portal)
     VALUES ($1, $2, $3)
     RETURNING id, key, label, portal, created_at`,
    [key, label, portal],
  )
  return rows[0]
}

export function toPublicRole(row) {
  if (!row) return null
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    portal: row.portal,
    createdAt: row.created_at,
  }
}
