import { env } from '../config/env.js'
import { migrateClientSchemaIfNeeded } from '../db/clientSchema/provision.js'
import { decryptSecret, encryptSecret } from '../lib/secretBox.js'
import {
  deleteGitCredential,
  findDefaultGitCredential,
  findGitCredentialByEmail,
  findGitCredentialById,
  insertGitCredential,
  listGitCredentials,
  updateGitCredential,
} from '../repositories/clientGitCredentials.repository.js'
import {
  deleteConnectedRepo,
  listConnectedRepoIdsForCredential,
  listConnectedRepos,
  upsertConnectedRepo,
} from '../repositories/clientGitConnectedRepos.repository.js'
import { findUserById } from '../repositories/users.repository.js'
import { getGitHubRepo, listGitHubRepos, repoAccessLabel, verifyGitHubToken } from './githubApi.service.js'
import {
  buildGitHubAuthorizeUrl,
  createGitHubOAuthState,
  exchangeGitHubOAuthCode,
  isGitHubOAuthEnabled,
  parseGitHubOAuthState,
} from './githubOAuth.service.js'

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
    authMethod: row.auth_method ?? 'pat',
    scopes: row.scopes ?? '',
    isDefault: row.is_default,
    tokenSet: hasCipher,
    lastVerifiedAt: row.last_verified_at,
    lastGithubLogin: row.last_github_login,
    tokenExpiresAt: row.token_expires_at ?? null,
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
    oauthEnabled: isGitHubOAuthEnabled(),
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

  const tokenCipher = encryptSecret(token)
  const existing = await findGitCredentialByEmail(schemaUserId, 'github', accountEmail)
  let row
  if (existing) {
    row = await updateGitCredential(schemaUserId, existing.id, {
      label: label || existing.label,
      tokenCipher,
      isDefault,
      authMethod: 'pat',
      scopes: 'pat',
      lastGithubLogin: verified.login,
      lastVerifiedAt: new Date(),
      metadata: { verifiedEmail: verified.email, githubUserId: verified.id },
    })
  } else {
    row = await insertGitCredential(schemaUserId, {
      accountEmail,
      label,
      tokenCipher,
      isDefault,
      authMethod: 'pat',
      scopes: 'pat',
      lastGithubLogin: verified.login,
      metadata: { verifiedEmail: verified.email, githubUserId: verified.id },
    })
    row = await updateGitCredential(schemaUserId, row.id, { lastVerifiedAt: new Date() })
  }
  return { credential: toPublicCredential(row), updated: Boolean(existing) }
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
  let { repos } = payload
  if (query.privateOnly === 'true' || query.privateOnly === true) {
    repos = repos.filter((r) => r.private)
  }
  return { repos, source: resolved.source, credentialId: resolved.credentialId ?? null }
}

function toExplorerBackend(row) {
  const meta = row.metadata ?? {}
  return {
    id: row.id,
    credentialId: row.git_credential_id,
    githubRepoId: Number(row.github_repo_id),
    name: row.name || row.full_name.split('/').pop() || row.full_name,
    repo: row.full_name,
    branch: row.default_branch || 'main',
    framework: row.language || meta.framework || '—',
    private: row.private,
    htmlUrl: row.html_url,
    status: 'idle',
    stats: null,
    discoveredAt: null,
    connectedAt: row.connected_at,
  }
}

export async function listExplorerConnectedBackends(userId) {
  const { schemaUserId } = await assertClientActor(userId)
  await migrateClientSchemaIfNeeded(schemaUserId)
  const rows = await listConnectedRepos(schemaUserId)
  return { backends: rows.map(toExplorerBackend) }
}

export async function listConnectedReposForCredential(userId, credentialId) {
  const { schemaUserId } = await assertClientActor(userId)
  await migrateClientSchemaIfNeeded(schemaUserId)
  const cred = await findGitCredentialById(schemaUserId, credentialId)
  if (!cred) throw httpError(404, 'Git credential not found')
  const githubRepoIds = await listConnectedRepoIdsForCredential(schemaUserId, credentialId)
  return { credentialId, githubRepoIds: githubRepoIds.map(Number) }
}

export async function setExplorerRepoConnected(userId, body) {
  const { schemaUserId } = await assertClientActor(userId)
  await migrateClientSchemaIfNeeded(schemaUserId)

  const credentialId = String(body?.credentialId ?? '')
  const connected = body?.connected !== false
  const githubRepoId = Number(body?.githubRepoId)
  if (!credentialId) throw httpError(400, 'credentialId is required')
  if (!Number.isFinite(githubRepoId) || githubRepoId <= 0) throw httpError(400, 'githubRepoId is required')

  const cred = await findGitCredentialById(schemaUserId, credentialId)
  if (!cred) throw httpError(404, 'Git credential not found')

  if (!connected) {
    await deleteConnectedRepo(schemaUserId, credentialId, githubRepoId)
    return { connected: false, githubRepoId, credentialId }
  }

  const fullName = String(body?.fullName ?? '').trim()
  const name = String(body?.name ?? '').trim() || fullName.split('/').pop() || fullName
  if (!fullName.includes('/')) throw httpError(400, 'fullName must be owner/repo')

  const row = await upsertConnectedRepo(schemaUserId, {
    gitCredentialId: credentialId,
    githubRepoId,
    fullName,
    name,
    defaultBranch: String(body?.defaultBranch ?? 'main').trim() || 'main',
    private: Boolean(body?.private),
    htmlUrl: String(body?.htmlUrl ?? '').trim(),
    language: String(body?.language ?? '').trim(),
    metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : {},
  })
  return { connected: true, backend: toExplorerBackend(row) }
}

export async function listCredentialRepositories(userId, credentialId, query = {}) {
  const { schemaUserId } = await assertClientActor(userId)
  const row = await findGitCredentialById(schemaUserId, credentialId)
  if (!row) throw httpError(404, 'Git credential not found')
  const resolved = await resolveCredential(schemaUserId, { credentialId })
  const profile = await verifyGitHubToken(resolved.token)

  const perPage = 100
  let page = 1
  let collected = []
  for (let i = 0; i < 5; i++) {
    const batch = await listGitHubRepos(resolved.token, { page, perPage })
    collected = collected.concat(batch.repos)
    if (batch.repos.length < perPage) break
    page += 1
  }

  let repos = collected.map((r) => ({
    ...r,
    access: repoAccessLabel(r.permissions),
  }))
  if (query.privateOnly === 'true' || query.privateOnly === true) {
    repos = repos.filter((r) => r.private)
  }

  const connectedIdSet = new Set(await listConnectedRepoIdsForCredential(schemaUserId, credentialId))

  const stats = {
    total: collected.length,
    private: collected.filter((r) => r.private).length,
    public: collected.filter((r) => !r.private).length,
    read: collected.filter((r) => repoAccessLabel(r.permissions) === 'read').length,
    write: collected.filter((r) => ['write', 'admin'].includes(repoAccessLabel(r.permissions))).length,
  }

  return {
    credentialId,
    accountEmail: row.account_email,
    authMethod: row.auth_method ?? 'pat',
    lastGithubLogin: row.last_github_login,
    scopes: row.scopes ?? '',
    profile: {
      login: profile.login,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    },
    stats,
    repos: repos.map((r) => ({
      ...r,
      connectedToExplorer: connectedIdSet.has(String(r.id)),
    })),
  }
}

export async function getRepo(userId, owner, repo, query = {}) {
  const { schemaUserId } = await assertClientActor(userId)
  const resolved = await resolveCredential(schemaUserId, { credentialId: query.credentialId })
  const repository = await getGitHubRepo(resolved.token, owner, repo)
  return { repo: repository, source: resolved.source, credentialId: resolved.credentialId ?? null }
}

async function saveOAuthCredential(schemaUserId, { accessToken, scope }, verified) {
  const primaryEmail =
    verified.emails?.find((e) => e.primary && e.verified)?.email ||
    verified.emails?.[0]?.email ||
    verified.email ||
    `${verified.login}@users.noreply.github.com`
  const accountEmail = primaryEmail.toLowerCase()
  const tokenCipher = encryptSecret(accessToken)
  const patch = {
    label: `GitHub @${verified.login}`,
    tokenCipher,
    isDefault: true,
    authMethod: 'oauth',
    scopes: scope,
    lastGithubLogin: verified.login,
    lastVerifiedAt: new Date(),
    metadata: {
      verifiedEmail: verified.email,
      githubUserId: verified.id,
      avatarUrl: verified.avatarUrl,
    },
  }
  const existing = await findGitCredentialByEmail(schemaUserId, 'github', accountEmail)
  if (existing) {
    return updateGitCredential(schemaUserId, existing.id, patch)
  }
  const row = await insertGitCredential(schemaUserId, {
    accountEmail,
    label: patch.label,
    tokenCipher: patch.tokenCipher,
    isDefault: true,
    authMethod: 'oauth',
    scopes: scope,
    lastGithubLogin: verified.login,
    metadata: patch.metadata,
  })
  return updateGitCredential(schemaUserId, row.id, { lastVerifiedAt: patch.lastVerifiedAt })
}

export async function startGitHubOAuth(userId) {
  const { actor, schemaUserId } = await assertClientActor(userId)
  assertSuperAdmin(actor)
  if (!isGitHubOAuthEnabled()) {
    throw httpError(503, 'GitHub sign-in is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_OAUTH_REDIRECT_URI.')
  }
  const state = createGitHubOAuthState({ userId: actor.id, tenantSchemaUserId: schemaUserId })
  return { authorizeUrl: buildGitHubAuthorizeUrl(state) }
}

export async function completeGitHubOAuthCallback(code, state) {
  const { tenantSchemaUserId } = parseGitHubOAuthState(state)
  const exchanged = await exchangeGitHubOAuthCode(code)
  const verified = await verifyGitHubToken(exchanged.accessToken)
  await migrateClientSchemaIfNeeded(tenantSchemaUserId)
  await saveOAuthCredential(tenantSchemaUserId, exchanged, verified)
  const success = new URL(env.github.oauthSuccessUrl)
  success.searchParams.set('github', 'connected')
  return success.toString()
}

export async function completeGitHubOAuthCallbackWithError(message) {
  const url = new URL(env.github.oauthSuccessUrl)
  url.searchParams.set('github', 'error')
  url.searchParams.set('message', message.slice(0, 200))
  return url.toString()
}
