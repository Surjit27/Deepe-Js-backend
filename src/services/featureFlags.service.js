import {
  deleteClientOverride,
  insertFeatureFlag,
  listFeatureFlags,
  listOverridesForClient,
  updateFeatureFlag,
  upsertClientOverride,
} from '../repositories/featureFlags.repository.js'

const KEY_RE = /^[a-z][a-z0-9_.]{1,63}$/

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function toPublicFlag(row, override) {
  const enabled = override !== undefined ? override.enabled : row.default_enabled
  return {
    key: row.key,
    label: row.label,
    description: row.description,
    navPath: row.nav_path,
    defaultEnabled: row.default_enabled,
    enabled,
    hasClientOverride: override !== undefined,
    sortOrder: row.sort_order,
  }
}

export async function adminListFeatureFlags() {
  const flags = await listFeatureFlags()
  return { flags: flags.map((row) => toPublicFlag(row)) }
}

export async function adminCreateFeatureFlag(body) {
  const key = String(body?.key ?? '').trim().toLowerCase()
  const label = String(body?.label ?? '').trim()
  if (!KEY_RE.test(key)) throw httpError(400, 'Flag key must be lowercase letters, numbers, dots, or underscores')
  if (!label) throw httpError(400, 'Label is required')
  const row = await insertFeatureFlag({
    key,
    label,
    description: String(body?.description ?? ''),
    navPath: String(body?.navPath ?? ''),
    defaultEnabled: body?.defaultEnabled !== false,
    sortOrder: Number(body?.sortOrder) || 0,
  })
  return toPublicFlag(row)
}

export async function adminPatchFeatureFlag(key, body) {
  const row = await updateFeatureFlag(key, {
    label: body?.label != null ? String(body.label).trim() : undefined,
    description: body?.description != null ? String(body.description) : undefined,
    navPath: body?.navPath != null ? String(body.navPath) : undefined,
    defaultEnabled: body?.defaultEnabled,
    sortOrder: body?.sortOrder,
  })
  if (!row) throw httpError(404, 'Feature flag not found')
  return toPublicFlag(row)
}

export async function adminSetClientOverride(clientUserId, flagKey, enabled) {
  if (typeof enabled !== 'boolean') throw httpError(400, 'enabled must be a boolean')
  await upsertClientOverride(clientUserId, flagKey, enabled)
  return { clientUserId, flagKey, enabled }
}

export async function adminClearClientOverride(clientUserId, flagKey) {
  await deleteClientOverride(clientUserId, flagKey)
  return { ok: true }
}

export async function resolveClientFeatureFlags(clientUserId) {
  const flags = await listFeatureFlags()
  const overrides = await listOverridesForClient(clientUserId)
  const byKey = new Map(overrides.map((o) => [o.flag_key, o]))
  return {
    flags: flags.map((row) => toPublicFlag(row, byKey.get(row.key))),
  }
}