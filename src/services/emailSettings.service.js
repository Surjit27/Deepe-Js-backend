import sgMail from '@sendgrid/mail'
import { env } from '../config/env.js'
import { decryptSecret, encryptSecret } from '../lib/secretBox.js'
import { getEmailSettingsRow, saveEmailSettingsRow } from '../repositories/emailSettings.repository.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function resolvedApiKey(row) {
  const saved = decryptSecret(row?.api_key_cipher)
  if (saved) return { apiKey: saved, source: 'saved' }
  if (env.sendgridApiKey) return { apiKey: env.sendgridApiKey, source: 'env' }
  return { apiKey: '', source: 'none' }
}

function maskSendGridKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('SG.')) return null
  const tail = apiKey.slice(-4)
  return `SG.${'•'.repeat(12)}${tail}`
}

function toPublic(row) {
  const { apiKey, source } = resolvedApiKey(row)
  const savedInDb = Boolean(row?.api_key_cipher)
  return {
    enabled: row.enabled,
    fromEmail: row.from_email,
    fromName: row.from_name,
    apiKeySet: source !== 'none',
    apiKeySource: source,
    apiKeyMasked: apiKey ? maskSendGridKey(apiKey) : null,
    apiKeySavedInDatabase: savedInDb,
    storageTable: 'email_settings',
    storageColumn: savedInDb ? 'api_key_cipher' : null,
    updatedAt: row.updated_at,
  }
}

export async function getEmailSettings() {
  const row = await getEmailSettingsRow()
  if (!row) throw httpError(500, 'Email settings are not initialized')
  return toPublic(row)
}

export async function updateEmailSettings(body) {
  const current = await getEmailSettingsRow()
  if (!current) throw httpError(500, 'Email settings are not initialized')

  const enabled = Boolean(body?.enabled)
  const fromEmail = String(body?.fromEmail ?? '').trim().toLowerCase()
  const fromName = String(body?.fromName ?? '').trim()
  const apiKey = body?.apiKey == null ? '' : String(body.apiKey).trim()

  if (fromName.length > 255) throw httpError(400, 'From name is too long')
  if (fromEmail && !EMAIL_RE.test(fromEmail)) throw httpError(400, 'From address must be an email')
  if (apiKey && !apiKey.startsWith('SG.')) throw httpError(400, 'SendGrid API keys start with SG.')
  if (apiKey.length > 400) throw httpError(400, 'API key is too long')
  if (enabled && !fromEmail) throw httpError(400, 'From address is required when email is enabled')
  if (enabled && !apiKey && !current.api_key_cipher && !env.sendgridApiKey) {
    throw httpError(400, 'Add a SendGrid API key before enabling email')
  }

  const saved = await saveEmailSettingsRow({
    enabled,
    apiKeyCipher: apiKey ? encryptSecret(apiKey) : current.api_key_cipher,
    fromEmail,
    fromName,
  })
  return toPublic(saved)
}

export async function sendTestEmail(to) {
  const row = await getEmailSettingsRow()
  if (!row) throw httpError(500, 'Email settings are not initialized')
  const recipient = String(to ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(recipient)) throw httpError(400, 'Enter an email address to receive the test')
  if (!row.from_email) throw httpError(400, 'Save a from address before sending a test')

  const { apiKey } = resolvedApiKey(row)
  if (!apiKey) throw httpError(400, 'Add a SendGrid API key in Settings or SENDGRID_API_KEY')

  sgMail.setApiKey(apiKey)
  try {
    const [response] = await sgMail.send({
      to: recipient,
      from: { email: row.from_email, name: row.from_name || undefined },
      replyTo: row.from_email,
      subject: 'Aazhi test email',
      text: 'This is a test message from Aazhi. Email is configured with SendGrid.',
      html: '<p>This is a test message from <strong>Aazhi</strong>. Email is configured with SendGrid.</p>',
      trackingSettings: { clickTracking: { enable: false }, openTracking: { enable: false } },
    })
    const messageId = response?.headers?.['x-message-id'] || null
    return {
      ok: true,
      to: recipient,
      from: row.from_email,
      messageId,
      deliveryNote:
        'SendGrid accepted the message. Delivery can take 1–5 minutes. Check spam/junk and SendGrid → Activity if nothing arrives.',
    }
  } catch (err) {
    const detail = err?.response?.body?.errors?.[0]?.message || err.message || 'SendGrid rejected the message'
    const hint =
      /sender identity|verified sender/i.test(detail)
        ? `${detail} Verify this From address under SendGrid → Settings → Sender Authentication, then save the same address in Aazhi Settings.`
        : detail
    throw httpError(400, hint)
  }
}
