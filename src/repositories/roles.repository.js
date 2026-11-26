import { getPostgresPool } from '../db/postgres.js'

export async function listRoles() {
  const { rows } = await getPostgresPool().query(
    `SELECT id, key, label, portal, permissions, created_at FROM roles ORDER BY created_at ASC`,
  )
  return rows
}

export async function listRolesByPortal(portal) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, key, label, portal, permissions, created_at FROM roles WHERE portal = $1 ORDER BY created_at ASC`,
    [portal],
  )
  return rows
}

export async function findRoleByKey(key) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, key, label, portal, permissions, created_at FROM roles WHERE key = $1`,
    [key],
  )
  return rows[0] ?? null
}

export async function createRole({ key, label, portal, permissions = [] }) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO roles (key, label, portal, permissions)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, key, label, portal, permissions, created_at`,
    [key, label, portal, JSON.stringify(permissions)],
  )
  return rows[0]
}

export async function updateRolePermissions(key, permissions) {
  const { rows } = await getPostgresPool().query(
    `UPDATE roles SET permissions = $2::jsonb WHERE key = $1
     RETURNING id, key, label, portal, permissions, created_at`,
    [key, JSON.stringify(permissions)],
  )
  return rows[0] ?? null
}

export function toPublicRole(row) {
  if (!row) return null
  const perms = row.permissions
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    portal: row.portal,
    permissions: Array.isArray(perms) ? perms : [],
    createdAt: row.created_at,
  }
}
