import bcrypt from 'bcryptjs'
import { listRolesByPortal, toPublicRole } from '../repositories/roles.repository.js'
import {
  createUser,
  findUserByEmail,
  findUserById,
  listUsersInTenant,
  toPublicUser,
} from '../repositories/users.repository.js'
import { provisionClientSchema } from '../db/clientSchema/provision.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function tenantOwnerIdForUser(userRow) {
  return userRow.tenant_owner_id || userRow.id
}

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

export async function listClientPortalRoles() {
  const rows = await listRolesByPortal('client')
  return { roles: rows.map(toPublicRole) }
}

export async function listTenantUsers(actorUserId) {
  const actor = await findUserById(actorUserId)
  if (!actor || actor.role !== 'client') throw httpError(403, 'Client portal required')
  const ownerId = tenantOwnerIdForUser(actor)
  const rows = await listUsersInTenant(ownerId)
  return { users: rows.map(toPublicUser) }
}

export async function inviteTenantUser(actorUserId, { email, password, displayName, accessRoleKey = 'member' }) {
  const actor = await findUserById(actorUserId)
  if (!actor || actor.role !== 'client') throw httpError(403, 'Client portal required')
  if (actor.access_role_key !== 'super_admin') {
    throw httpError(403, 'Only Super admin can invite users')
  }
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(normalizedEmail)) throw httpError(400, 'Enter a valid email address')
  if (String(password).length < 8) throw httpError(400, 'Password must be at least 8 characters')
  if (await findUserByEmail(normalizedEmail)) throw httpError(409, 'Email already registered')
  const ownerId = tenantOwnerIdForUser(actor)
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await createUser({
    email: normalizedEmail,
    passwordHash,
    role: 'client',
    displayName: displayName?.trim() || normalizedEmail.split('@')[0],
    accessRoleKey: accessRoleKey === 'super_admin' ? 'super_admin' : 'member',
    tenantOwnerId: ownerId,
  })
  provisionClientSchema(user.id).catch(() => {})
  return { user: toPublicUser(user) }
}
