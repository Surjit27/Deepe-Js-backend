import { getPostgresPool } from '../db/postgres.js'

export async function findUserByEmail(email) {
  const { rows } = await getPostgresPool().query(
    `SELECT u.id, u.email, u.password_hash, u.role, u.access_role_key, u.tenant_owner_id, u.display_name, u.created_at,
            COALESCE(r.portal, CASE WHEN u.role = 'admin' THEN 'admin' ELSE 'client' END) AS portal
     FROM users u
     LEFT JOIN roles r ON r.key = u.role
     WHERE u.email = $1`,
    [email.toLowerCase()],
  )
  return rows[0] ?? null
}

export async function findUserById(id) {
  const { rows } = await getPostgresPool().query(
    `SELECT u.id, u.email, u.role, u.access_role_key, u.tenant_owner_id, u.display_name, u.created_at,
            COALESCE(r.portal, CASE WHEN u.role = 'admin' THEN 'admin' ELSE 'client' END) AS portal
     FROM users u
     LEFT JOIN roles r ON r.key = u.role
     WHERE u.id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function createUser({ email, passwordHash, role, displayName, accessRoleKey, tenantOwnerId }) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO users (email, password_hash, role, display_name, access_role_key, tenant_owner_id)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'super_admin'), $6)
     RETURNING id, email, role, access_role_key, tenant_owner_id, display_name, created_at,
       (SELECT portal FROM roles WHERE key = $3) AS portal`,
    [email.toLowerCase(), passwordHash, role, displayName, accessRoleKey ?? null, tenantOwnerId ?? null],
  )
  return rows[0]
}

export async function listUsers({ role } = {}) {
  if (role) {
    const { rows } = await getPostgresPool().query(
      `SELECT u.id, u.email, u.role, u.access_role_key, u.tenant_owner_id, u.display_name, u.created_at, r.portal
       FROM users u
       LEFT JOIN roles r ON r.key = u.role
       WHERE u.role = $1 ORDER BY u.created_at DESC`,
      [role],
    )
    return rows
  }
  const { rows } = await getPostgresPool().query(
    `SELECT u.id, u.email, u.role, u.access_role_key, u.tenant_owner_id, u.display_name, u.created_at, r.portal
     FROM users u
     LEFT JOIN roles r ON r.key = u.role
     ORDER BY u.created_at DESC`,
  )
  return rows
}

export async function listUsersInTenant(tenantOwnerId) {
  const { rows } = await getPostgresPool().query(
    `SELECT u.id, u.email, u.role, u.access_role_key, u.tenant_owner_id, u.display_name, u.created_at
     FROM users u
     WHERE u.role = 'client' AND (u.tenant_owner_id = $1 OR u.id = $1)
     ORDER BY u.created_at ASC`,
    [tenantOwnerId],
  )
  return rows
}

export function toPublicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    accessRoleKey: row.access_role_key ?? 'super_admin',
    tenantOwnerId: row.tenant_owner_id ?? row.id,
    portal: row.portal || (row.role === 'admin' ? 'admin' : 'client'),
    displayName: row.display_name,
    createdAt: row.created_at,
  }
}
