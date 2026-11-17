import { EMAIL_PROVIDER_TYPES, PROVIDER_STATUS } from '../lib/providerCatalog.js'
import { maskSendGridKey } from '../lib/apiKeyMask.js'
import { encryptSecret } from '../lib/secretBox.js'
import { resolvedSendGridApiKey } from '../lib/emailProviderSecrets.js'
import {
  countEmailProviders,
  deleteEmailProvider,
  getDefaultEmailProviderRow,
  getEmailProviderById,
  insertEmailProvider,
  listEmailProviders,
  syncEmailSettingsFromProvider,
  updateEmailProvider,
} from '../repositories/emailProvider.repository.js'
import {
  previewEmailForProviderRow,
  sendTestEmailForProviderRow,
} from './emailDelivery.service.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function toPublicEmailProvider(row) {
  if (!row) return null
  const { apiKey, source } = row.provider === 'sendgrid' ? resolvedSendGridApiKey(row) : { apiKey: '', source: 'none' }
  const savedInDb = Boolean(row.api_key_cipher)
  return {
    id: row.id,
    provider: row.provider,
    providerLabel: EMAIL_PROVIDER_TYPES.find((t) => t.id === row.provider)?.label ?? row.provider,
    name: row.name,
    status: row.status,
    enabled: row.enabled,
    fromEmail: row.from_email,
    fromName: row.from_name,
    isDefault: row.is_default,
    apiKeySet: source !== 'none',
    apiKeySource: source,
    apiKeyMasked: apiKey && row.provider === 'sendgrid' ? maskSendGridKey(apiKey) : null,
    apiKeySavedInDatabase: savedInDb,
    storageSchema: 'public',
    storageTable: 'email_providers',
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}

export function getEmailProviderTypesCatalog() {
  return EMAIL_PROVIDER_TYPES
}

export async function listEmailProvidersPublic() {
  const rows = await listEmailProviders()
  return rows.map(toPublicEmailProvider)
}

export async function getEmailProviderPublic(id) {
  const row = await getEmailProviderById(id)
  if (!row) throw httpError(404, 'Email provider not found')
  return toPublicEmailProvider(row)
}

export async function createEmailProvider(body) {
  const provider = String(body?.provider ?? 'sendgrid').trim().toLowerCase()
  if (!EMAIL_PROVIDER_TYPES.some((t) => t.id === provider)) throw httpError(400, 'Unsupported email provider')
  const name = String(body?.name ?? '').trim() || EMAIL_PROVIDER_TYPES.find((t) => t.id === provider)?.label || provider
  const count = await countEmailProviders()
  const row = await insertEmailProvider({
    provider,
    name,
    status: body?.status === PROVIDER_STATUS.ACTIVE ? PROVIDER_STATUS.ACTIVE : PROVIDER_STATUS.INACTIVE,
    enabled: Boolean(body?.enabled),
    isDefault: count === 0 || Boolean(body?.isDefault),
  })
  if (row.is_default) await syncEmailSettingsFromProvider(row)
  return toPublicEmailProvider(row)
}

export async function patchEmailProvider(id, body) {
  const current = await getEmailProviderById(id)
  if (!current) throw httpError(404, 'Email provider not found')

  const enabled = body?.enabled == null ? null : Boolean(body.enabled)
  const fromEmail = body?.fromEmail == null ? null : String(body.fromEmail).trim().toLowerCase()
  const fromName = body?.fromName == null ? null : String(body.fromName).trim()
  const apiKey = body?.apiKey == null ? null : String(body.apiKey).trim()

  if (fromEmail && !EMAIL_RE.test(fromEmail)) throw httpError(400, 'From address must be an email')
  if (apiKey && current.provider === 'sendgrid' && !apiKey.startsWith('SG.')) {
    throw httpError(400, 'SendGrid API keys start with SG.')
  }

  const row = await updateEmailProvider(id, {
    name: body?.name == null ? null : String(body.name).trim(),
    status: body?.status ?? null,
    enabled,
    fromEmail,
    fromName,
    isDefault: body?.isDefault ?? null,
    apiKeyCipher: apiKey ? encryptSecret(apiKey) : null,
  })
  if (!row) throw httpError(404, 'Email provider not found')
  if (row.is_default) await syncEmailSettingsFromProvider(row)
  return toPublicEmailProvider(row)
}

export async function removeEmailProvider(id) {
  const current = await getEmailProviderById(id)
  if (!current) throw httpError(404, 'Email provider not found')
  const count = await countEmailProviders()
  if (count <= 1) throw httpError(400, 'Keep at least one email provider')
  await deleteEmailProvider(id)
  const nextDefault = await getDefaultEmailProviderRow()
  if (nextDefault) await syncEmailSettingsFromProvider(nextDefault)
  return { ok: true }
}

export async function previewEmailForProvider(id, templateId, variables, options) {
  const row = await getEmailProviderById(id)
  if (!row) throw httpError(404, 'Email provider not found')
  return previewEmailForProviderRow(row, templateId, variables, options)
}

export async function sendTestEmailForProvider(id, to, options) {
  const row = await getEmailProviderById(id)
  if (!row) throw httpError(404, 'Email provider not found')
  return sendTestEmailForProviderRow(row, to, options)
}

export async function getDefaultEmailProvider() {
  const row = await getDefaultEmailProviderRow()
  if (!row) throw httpError(500, 'No email provider configured')
  return row
}

export { toPublicEmailProvider }