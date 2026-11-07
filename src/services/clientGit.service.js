import { env } from '../config/env.js'
import { migrateClientSchemaIfNeeded } from '../db/clientSchema/provision.js'
import { decryptSecret, encryptSecret } from '../lib/secretBox.js'
import {
  deleteGitCredential,
  findDefaultGitCredential,
  findGitCredentialById,
  insertGitCredential,
  listGitCredentials,
  updateGitCredential,
} from '../repositories/clientGitCredentials.repository.js'
import { findUserById } from '../repositories/users.repository.js'
import { getGitHubRepo, listGitHubRepos, verifyGitHubToken } from './githubApi.service.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function tenantSchemaUserId(userRow) {
  return userRow.tenant_owner_id || userRow.id
}

function toPublicCredential(row, { tokenCipherPresent } = {}) {
  if (!row) return null
  const hasCipher = tokenCipherPresent ?? Boolean(row.token_cipher)
  return {
    id: row.id,
    provider: row.provider,
    accountEmail: row.account_email,
    label: row.label,
    isDefault: row.is_default,
    tokenSet: hasCipher,
    lastVerifiedAt: row.last_verified_at,
    lastGithubLogin: row.last_github_login,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function resolvedEnvCredential() {
  const token = env.github.token
  const accountEmail = env.github.accountEmail
  if (!token) return null
  return {
    source: 'env',
    accountEmail,
    token,
    label: 'Environment (GITHUB_TOKEN)',
  }
}

function resolvedFromRow(row) {
  const token = decryptSecret(row.token_cipher)
  if (!token) return null
  return {
    source: 'database',
    credentialId: row.id,
    accountEmail: row.account_email,
    token,
    label: row.label,
    lastGithubLogin: row.last_github_login,
  }
}

async function resolveCredential(clientUserId, { credentialId } = {}) {
  await migrateClientSchemaIfNeeded(clientUserId)
  if (credentialId) {
    const row = await findGitCredentialById(clientUserId, credentialId)
    if (!row) throw httpError(404, 'Git credential not found')
    const resolved = resolvedFromRow(row)
    if (!resolved) throw httpError(400, 'Stored token is missing or invalid — update the credential')
    return resolved
  }
  const row = await findDefaultGitCredential(clientUserId)
  if (row) {
    const resolved = resolvedFromRow(row)
    if (resolved) return resolved
  }
  const fromEnv = resolvedEnvCredential()
  if (fromEnv) return fromEnv
  throw httpError(400, 'No GitHub access configured. Save a credential or set GITHUB_ACCOUNT_EMAIL + GITHUB_TOKEN in the server env.')
}

async function assertClientActor(userId) {
  const actor = await findUserById(userId)
  if (!actor || actor.role !== 'client') throw httpError(403, 'Client portal required')
  return { actor, schemaUserId: tenantSchemaUserId(actor) }
}

function assertSuperAdmin(actor) {
  if (actor.access_role_key !== 'super_admin') throw httpError(403, 'Only Super admin can manage Git credentials')
}

export async function getGitAccessStatus(userId) {
  const { schemaUserId } = await assertClientActor(userId)
  await migrateClientSchemaIfNeeded(schemaUserId)
  const rows = await listGitCredentials(schemaUserId)
  const envCred = resolvedEnvCredential()
  const defaultRow = rows.find((r) => r.is_default) ?? rows[0]
  return {
    envConfigured: Boolean(envCred),
    envAccountEmail: envCred?.accountEmail ?? '',
    credentialCount: rows.length,
    defaultCredentialId: defaultRow?.id ?? null,
    canAccessGit: Boolean(envCred || rows.some((r) => r.token_cipher)),
  }
}

export async function listCredentials(userId) {
  const { schemaUserId } = await assertClientActor(userId)
  await migrateClientSchemaIfNeeded(schemaUserId)
  const rows = await listGitCredentials(schemaUserId)
  const envCred = resolvedEnvCredential()
  return {
    envFallback: envCred
      ? { accountEmail: envCred.accountEmail, tokenSet: true, source: 'env' }
      : { accountEmail: '', tokenSet: false, source: 'none' },
    credentials: rows.map((r) => toPublicCredential(r)),
  }
}

export async function createCredential(userId, body) {
  const { actor, schemaUserId } = await assertClientActor(userId)
  assertSuperAdmin(actor)
  const accountEmail = String(body?.accountEmail ?? '').trim().toLowerCase()
  const label = String(body?.label ?? '').trim() || accountEmail
  const token = String(body?.token ?? '').trim()
  const isDefault = body?.isDefault !== false

  if (!EMAIL_RE.test(accountEmail)) throw httpError(400, 'Enter the GitHub account email (Gmail or primary email on the account)')
  if (token.length < 20) throw httpError(400, 'GitHub personal access token looks too short')
  if (token.length > 512) throw httpError(400, 'Token is too long')

  await migrateClientSchemaIfNeeded(schemaUserId)
  let verified = null
  try {
    verified = await verifyGitHubToken(token)
  } catch (err) {
    throw httpError(err.status === 403 ? 403 : 400, err.message ?? 'Token could not access GitHub')
  }

  const row = await insertGitCredential(schemaUserId, {
    accountEmail,
    label,
    tokenCipher: encryptSecret(token),
    isDefault,
    lastGithubLogin: verified.login,
    metadata: { verifiedEmail: verified.email, githubUserId: verified.id },
  })
  const refreshed = await updateGitCredential(schemaUserId, row.id, { lastVerifiedAt: new Date() })
  return { credential: toPublicCredential(refreshed ?? row) }
}

export async function updateCredential(userId, credentialId, body) {
  const { actor, schemaUserId } = await assertClientActor(userId)
  assertSuperAdmin(actor)
  await migrateClientSchemaIfNeeded(schemaUserId)
  const existing = await findGitCredentialById(schemaUserId, credentialId)
  if (!existing) throw httpError(404, 'Git credential not found')

  const patch = {}
  if (body?.accountEmail != null) {
    const accountEmail = String(body.accountEmail).trim().toLowerCase()
    if (!EMAIL_RE.test(accountEmail)) throw httpError(400, 'Enter a valid account email')
    patch.accountEmail = accountEmail
  }
  if (body?.label != null) patch.label = String(body.label).trim()
  if (body?.isDefault != null) patch.isDefault = Boolean(body.isDefault)
  if (body?.token != null) {
    const token = String(body.token).trim()
    if (token.length < 20) throw httpError(400, 'GitHub personal access token looks too short')
    patch.tokenCipher = encryptSecret(token)
    const verified = await verifyGitHubToken(token)
    patch.lastGithubLogin = verified.login
    patch.lastVerifiedAt = new Date()
    patch.metadata = { ...(existing.metadata ?? {}), verifiedEmail: verified.email, githubUserId: verified.id }
  }

  const row = await updateGitCredential(schemaUserId, credentialId, patch)
  return { credential: toPublicCredential(row) }
}

export async function removeCredential(userId, credentialId) {
  const { actor, schemaUserId } = await assertClientActor(userId)
  assertSuperAdmin(actor)
  await migrateClientSchemaIfNeeded(schemaUserId)
  const ok = await deleteGitCredential(schemaUserId, credentialId)
  if (!ok) throw httpError(404, 'Git credential not found')
  return { ok: true }
}

export async function verifyGitAccess(userId, { credentialId } = {}) {
  const { schemaUserId } = await assertClientActor(userId)
  const resolved = await resolveCredential(schemaUserId, credentialId ? { credentialId } : {})
  const profile = await verifyGitHubToken(resolved.token)
  if (resolved.credentialId) {
    await updateGitCredential(schemaUserId, resolved.credentialId, {
      lastVerifiedAt: new Date(),
      lastGithubLogin: profile.login,
      metadata: { verifiedEmail: profile.email, githubUserId: profile.id },
    })
  }
  return {
    source: resolved.source,
    credentialId: resolved.credentialId ?? null,
    accountEmail: resolved.accountEmail,
    profile,
  }
}

export async function verifyCredential(userId, credentialId) {
  return verifyGitAccess(userId, { credentialId })
}

export async function listRepos(userId, query = {}) {
  const { schemaUserId } = await assertClientActor(userId)
  const resolved = await resolveCredential(schemaUserId, { credentialId: query.credentialId })
  const payload = await listGitHubRepos(resolved.token, { page: query.page, perPage: query.perPage })
  return { ...payload, source: resolved.source, credentialId: resolved.credentialId ?? null }
}

export async function getRepo(userId, owner, repo, query = {}) {
  const { schemaUserId } = await assertClientActor(userId)
  const resolved = await resolveCredential(schemaUserId, { credentialId: query.credentialId })
  const repository = await getGitHubRepo(resolved.token, owner, repo)
  return { repo: repository, source: resolved.source, credentialId: resolved.credentialId ?? null }
}
