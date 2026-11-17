import { listEmailTemplates } from '../email/templates.js'
import { getEmailPreviewById, toPublicPreview } from '../repositories/emailPreview.repository.js'
import { getDefaultEmailProviderRow, syncEmailSettingsFromProvider, updateEmailProvider } from '../repositories/emailProvider.repository.js'
import { encryptSecret } from '../lib/secretBox.js'
import {
  previewEmailForProvider,
  sendTestEmailForProvider,
  toPublicEmailProvider,
} from './emailProvider.service.js'
import { getTestRecipientEmailsForProvider } from './emailDelivery.service.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

/** Legacy shape for Settings tab compatibility (default email provider). */
export async function getEmailSettings() {
  const row = await getDefaultEmailProviderRow()
  if (!row) throw httpError(500, 'Email settings are not initialized')
  const pub = toPublicEmailProvider(row)
  return {
    ...pub,
    storageTable: 'email_providers',
    storageColumn: pub.apiKeySavedInDatabase ? 'api_key_cipher' : null,
  }
}

export async function updateEmailSettings(body) {
  const row = await getDefaultEmailProviderRow()
  if (!row) throw httpError(500, 'Email settings are not initialized')

  const enabled = Boolean(body?.enabled)
  const fromEmail = String(body?.fromEmail ?? '').trim().toLowerCase()
  const fromName = String(body?.fromName ?? '').trim()
  const apiKey = body?.apiKey == null ? '' : String(body.apiKey).trim()

  if (fromName.length > 255) throw httpError(400, 'From name is too long')
  if (fromEmail && !EMAIL_RE.test(fromEmail)) throw httpError(400, 'From address must be an email')
  if (apiKey && !apiKey.startsWith('SG.')) throw httpError(400, 'SendGrid API keys start with SG.')

  const saved = await updateEmailProvider(row.id, {
    enabled,
    fromEmail,
    fromName,
    status: enabled ? 'active' : 'inactive',
    apiKeyCipher: apiKey ? encryptSecret(apiKey) : null,
  })
  if (!saved) throw httpError(500, 'Could not save email settings')
  await syncEmailSettingsFromProvider(saved)
  return getEmailSettings()
}

export function getEmailTemplatesCatalog() {
  return listEmailTemplates()
}

export async function getTestRecipientEmails(emailProviderId = null) {
  const row = await getDefaultEmailProviderRow()
  const id = emailProviderId ?? row?.id
  return getTestRecipientEmailsForProvider(id)
}

export async function getStoredEmailPreview(id) {
  const previewRow = await getEmailPreviewById(id)
  if (!previewRow) throw httpError(404, 'Email preview not found')
  return toPublicPreview(previewRow)
}

export async function previewEmailTemplate(templateId, variables = {}, options = {}) {
  const row = await getDefaultEmailProviderRow()
  if (!row) throw httpError(500, 'Email settings are not initialized')
  const providerId = options.emailProviderId ?? row.id
  return previewEmailForProvider(providerId, templateId, variables, options)
}

export async function sendTestEmail(to, options = {}) {
  const row = await getDefaultEmailProviderRow()
  if (!row) throw httpError(500, 'Email settings are not initialized')
  const providerId = options.emailProviderId ?? row.id
  return sendTestEmailForProvider(providerId, to, options)
}