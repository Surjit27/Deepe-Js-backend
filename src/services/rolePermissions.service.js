import {
  catalogForPortal,
  defaultPermissionsForPortal,
  normalizePermissionKeys,
} from '../lib/rolePermissions.js'
import { findRoleByKey, toPublicRole, updateRolePermissions } from '../repositories/roles.repository.js'
import { findUserById } from '../repositories/users.repository.js'

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  throw err
}

export function getPermissionCatalog(portal) {
  if (portal !== 'admin' && portal !== 'client') {
    httpError(400, 'portal must be admin or client')
  }
  return { portal, permissions: catalogForPortal(portal) }
}

export async function adminPatchRolePermissions(roleKey, permissionKeys, actorRole) {
  if (actorRole !== 'admin') httpError(403, 'Only admins can update role permissions')
  const row = await findRoleByKey(roleKey)
  if (!row) httpError(404, 'Role not found')
  const permissions = normalizePermissionKeys(row.portal, permissionKeys)
  const updated = await updateRolePermissions(roleKey, permissions)
  return { role: toPublicRole(updated) }
}

export async function clientPatchAccessRolePermissions(actorUserId, roleKey, permissionKeys) {
  const actor = await findUserById(actorUserId)
  if (!actor || actor.role !== 'client') httpError(403, 'Client portal required')
  if (actor.access_role_key !== 'super_admin') {
    httpError(403, 'Only Super admin can update workspace role permissions')
  }
  const row = await findRoleByKey(roleKey)
  if (!row || row.portal !== 'client') httpError(404, 'Client access role not found')
  const permissions = normalizePermissionKeys('client', permissionKeys)
  const updated = await updateRolePermissions(roleKey, permissions)
  return { role: toPublicRole(updated) }
}

export function permissionsForNewRole(portal, roleKey) {
  return defaultPermissionsForPortal(portal, roleKey)
}