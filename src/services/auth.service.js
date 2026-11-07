import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { createRole, findRoleByKey, listRoles, toPublicRole } from '../repositories/roles.repository.js'
import {
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  toPublicUser,
} from '../repositories/users.repository.js'
import { getPostgresPool } from '../db/postgres.js'
import {
  consumeImpersonationCode,
  isJtiRevoked,
  issueImpersonationCode,
  revokeJti,
} from './tokenStore.js'
import { provisionClientSchema } from '../db/clientSchema/provision.js'
import { recordClientActivity } from './clientHistory.service.js'
import { AUDIT_DOMAIN } from '../audit/index.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function signAccessToken(user, { expiresIn, impersonatedBy } = {}) {
  const payload = {
    sub: user.id,
    role: user.role,
    portal: user.portal || (user.role === 'admin' ? 'admin' : 'client'),
    email: user.email,
    jti: randomUUID(),
  }
  if (impersonatedBy) payload.impersonatedBy = impersonatedBy
  return jwt.sign(payload, env.auth.jwtSecret, {
    expiresIn: expiresIn ?? env.auth.jwtExpiresIn,
  })
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.auth.jwtSecret)
  if (isJtiRevoked(payload.jti)) {
    const err = new Error('Token revoked')
    err.status = 401
    throw err
  }
  if (payload.impersonatedBy && payload.role !== 'client') {
    const err = new Error('Invalid impersonation token')
    err.status = 401
    throw err
  }
  return payload
}

export function revokeAccessToken(payload) {
  revokeJti(payload?.jti, payload?.exp)
}

function loginPortalForSurface(appSurface) {
  return appSurface === 'home' ? 'client' : appSurface
}

export async function login(email, password, appSurface) {
  const normalizedEmail = String(email).trim().toLowerCase()
  const normalizedPassword = String(password)
  if (!EMAIL_RE.test(normalizedEmail) || normalizedPassword.length < 1 || normalizedPassword.length > 200) {
    const err = new Error('Invalid email or password')
    err.status = 401
    throw err
  }
  const user = await findUserByEmail(normalizedEmail)
  if (!user) {
    const err = new Error('Invalid email or password')
    err.status = 401
    throw err
  }
  const ok = await bcrypt.compare(normalizedPassword, user.password_hash)
  if (!ok) {
    const err = new Error('Invalid email or password')
    err.status = 401
    throw err
  }
  const publicUser = toPublicUser(user)
  const portalForLogin = loginPortalForSurface(appSurface)
  if (publicUser.portal !== portalForLogin) {
    const err = new Error(
      publicUser.portal === 'admin'
        ? 'Admin accounts cannot sign in here. Use the admin console.'
        : 'This account must sign in at client.localhost, not admin.localhost',
    )
    err.status = 403
    throw err
  }
  const token = signAccessToken(publicUser)
  const result = { token, user: publicUser }
  if (appSurface === 'home') {
    result.handoffCode = issueImpersonationCode({ userId: publicUser.id })
  }
  if (publicUser.portal === 'client') {
    recordClientActivity(publicUser.id, {
      domain: AUDIT_DOMAIN.USER,
      action: 'client.sign_in',
      subjectId: publicUser.id,
      subjectLabel: publicUser.email,
      metadata: { performedByLabel: publicUser.displayName || publicUser.email },
    }).catch(() => {})
  }
  return result
}

export async function signUpClient({ email, password, displayName }) {
  const normalizedEmail = String(email).trim().toLowerCase()
  if (!EMAIL_RE.test(normalizedEmail)) {
    const err = new Error('Enter a valid email address')
    err.status = 400
    throw err
  }
  if (String(password).length < 8) {
    const err = new Error('Password must be at least 8 characters')
    err.status = 400
    throw err
  }
  const roleRow = await findRoleByKey('super_admin')
  if (!roleRow) {
    const err = new Error('Client sign-up is not available')
    err.status = 503
    throw err
  }
  const existing = await findUserByEmail(normalizedEmail)
  if (existing) {
    const err = new Error('Email already registered')
    err.status = 409
    throw err
  }
  const passwordHash = await bcrypt.hash(password, 12)
  let user = await createUser({
    email: normalizedEmail,
    passwordHash,
    role: 'client',
    displayName: displayName?.trim() || normalizedEmail.split('@')[0],
    accessRoleKey: 'super_admin',
  })
  await getPostgresPool().query(`UPDATE users SET tenant_owner_id = id WHERE id = $1`, [user.id])
  user = { ...user, tenant_owner_id: user.id, access_role_key: 'super_admin' }
  const publicUser = toPublicUser(user)
  provisionClientSchema(user.id)
    .then(() =>
      recordClientActivity(publicUser.id, {
        domain: AUDIT_DOMAIN.USER,
        action: 'client.sign_up',
        subjectId: publicUser.id,
        subjectLabel: publicUser.email,
        metadata: { performedByLabel: publicUser.displayName || publicUser.email },
      }),
    )
    .catch((err) => console.error('[client-schema] provision failed', user.id, err.message))
  return {
    user: publicUser,
    handoffCode: issueImpersonationCode({ userId: publicUser.id }),
  }
}

export async function getProfile(userId) {
  const user = await findUserById(userId)
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  return toPublicUser(user)
}

export async function registerUser({ email, password, displayName, role }, actorRole) {
  if (actorRole !== 'admin') {
    const err = new Error('Only admins can create accounts')
    err.status = 403
    throw err
  }
  const roleRow = await findRoleByKey(role)
  if (!roleRow) {
    const err = new Error('Unknown role')
    err.status = 400
    throw err
  }
  const existing = await findUserByEmail(email)
  if (existing) {
    const err = new Error('Email already registered')
    err.status = 409
    throw err
  }
  const passwordHash = await bcrypt.hash(password, 12)
  let user = await createUser({
    email,
    passwordHash,
    role,
    displayName: displayName || email.split('@')[0],
    accessRoleKey: role === 'client' ? 'super_admin' : undefined,
  })
  if (role === 'client') {
    await getPostgresPool().query(`UPDATE users SET tenant_owner_id = id WHERE id = $1`, [user.id])
    user = { ...user, tenant_owner_id: user.id, access_role_key: 'super_admin' }
    provisionClientSchema(user.id).catch(() => {})
  }
  return toPublicUser(user)
}

/** @deprecated use registerUser */
export async function registerClient(payload, actorRole) {
  return registerUser({ ...payload, role: 'client' }, actorRole)
}

const ROLE_KEY_RE = /^[a-z][a-z0-9_]{1,39}$/

export async function listRoleCatalog(actorRole) {
  if (actorRole !== 'admin') {
    const err = new Error('Forbidden')
    err.status = 403
    throw err
  }
  const rows = await listRoles()
  return rows.map(toPublicRole)
}

export async function createRoleCatalog({ key, label, portal }, actorRole) {
  if (actorRole !== 'admin') {
    const err = new Error('Only admins can create roles')
    err.status = 403
    throw err
  }
  const roleKey = String(key ?? '').trim().toLowerCase()
  const roleLabel = String(label ?? '').trim()
  if (!ROLE_KEY_RE.test(roleKey)) {
    const err = new Error('Role key must be 2–40 lowercase letters, numbers, or underscores')
    err.status = 400
    throw err
  }
  if (!roleLabel || roleLabel.length > 80) {
    const err = new Error('Role label is required')
    err.status = 400
    throw err
  }
  if (portal !== 'admin' && portal !== 'client') {
    const err = new Error('portal must be admin or client')
    err.status = 400
    throw err
  }
  const existing = await findRoleByKey(roleKey)
  if (existing) {
    const err = new Error('Role already exists')
    err.status = 409
    throw err
  }
  const row = await createRole({ key: roleKey, label: roleLabel, portal })
  return toPublicRole(row)
}

export async function startClientImpersonation(adminUserId, targetUserId) {
  const target = await findUserById(targetUserId)
  if (!target || target.role !== 'client') {
    const err = new Error('Only client accounts can be opened this way')
    err.status = 400
    throw err
  }
  const code = issueImpersonationCode({ userId: target.id, adminId: adminUserId })
  return { code, expiresInSeconds: 60 }
}

export async function exchangeImpersonationCode(code) {
  const row = consumeImpersonationCode(String(code ?? ''))
  if (!row) {
    const err = new Error('Session link expired or already used')
    err.status = 401
    throw err
  }
  const target = await findUserById(row.userId)
  if (!target || target.role !== 'client') {
    const err = new Error('Client account is no longer available')
    err.status = 403
    throw err
  }
  const publicUser = toPublicUser(target)
  if (row.adminId) {
    const token = signAccessToken(publicUser, {
      expiresIn: '2h',
      impersonatedBy: row.adminId,
    })
    return {
      token,
      user: { ...publicUser, impersonatedBy: row.adminId, impersonation: true },
    }
  }
  const token = signAccessToken(publicUser)
  return { token, user: publicUser }
}

export async function listAccounts(actorRole, { role } = {}) {
  if (actorRole !== 'admin') {
    const err = new Error('Forbidden')
    err.status = 403
    throw err
  }
  const rows = await listUsers({ role })
  return rows.map(toPublicUser)
}
