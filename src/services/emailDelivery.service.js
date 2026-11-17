import sgMail from '@sendgrid/mail'
import { TEST_EMAIL_TEMPLATE_ID, renderEmailTemplate } from '../email/templates.js'
import {
  insertEmailPreview,
  listDistinctTestRecipientEmails,
  updateEmailPreviewMessageId,
} from '../repositories/emailPreview.repository.js'
import { resolvedSendGridApiKey } from '../lib/emailProviderSecrets.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

async function persistRenderedEmail(row, fields) {
  const saved = await insertEmailPreview({
    ...fields,
    fromEmail: row.from_email ?? '',
    fromName: row.from_name ?? '',
    emailProviderId: row.id,
  })
  return saved.id
}

export async function previewEmailForProviderRow(row, templateId, variables = {}, options = {}) {
  const fromName = row.from_name || 'deepe'
  const merged = { fromName, productName: fromName || 'deepe', ...variables }
  const rendered = renderEmailTemplate(templateId, merged)
  const persist = options.persist !== false
  const previewId = persist
    ? await persistRenderedEmail(row, {
        templateId: rendered.templateId,
        kind: 'preview',
        subject: rendered.subject,
        htmlBody: rendered.html,
        textBody: rendered.text,
        variables: merged,
        actorUserId: options.actorUserId ?? null,
      })
    : null
  return {
    ...rendered,
    previewId,
    emailProviderId: row.id,
    from: { email: row.from_email || '', name: fromName },
  }
}

export async function sendTestEmailForProviderRow(row, to, options = {}) {
  if (row.provider !== 'sendgrid') throw httpError(400, `Test send is not implemented for ${row.provider} yet`)
  const recipient = String(to ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(recipient)) throw httpError(400, 'Enter an email address to receive the test')
  if (!row.from_email) throw httpError(400, 'Save a from address before sending a test')

  const { apiKey } = resolvedSendGridApiKey(row)
  if (!apiKey) throw httpError(400, 'Add a SendGrid API key or SENDGRID_API_KEY')

  const templateId = String(options.templateId ?? TEST_EMAIL_TEMPLATE_ID).trim() || TEST_EMAIL_TEMPLATE_ID
  const variables = {
    productName: row.from_name || 'deepe',
    recipientName: options.recipientName || recipient.split('@')[0],
    ...options.variables,
  }
  const rendered = renderEmailTemplate(templateId, variables)
  const { subject, html, text } = rendered

  const previewId = await persistRenderedEmail(row, {
    templateId: rendered.templateId,
    kind: 'sent',
    subject,
    htmlBody: html,
    textBody: text,
    variables,
    recipientEmail: recipient,
    actorUserId: options.actorUserId ?? null,
  })

  sgMail.setApiKey(apiKey)
  try {
    const [response] = await sgMail.send({
      to: recipient,
      from: { email: row.from_email, name: row.from_name || undefined },
      replyTo: row.from_email,
      subject,
      text,
      html,
      trackingSettings: { clickTracking: { enable: false }, openTracking: { enable: false } },
    })
    const messageId = response?.headers?.['x-message-id'] || null
    if (messageId) await updateEmailPreviewMessageId(previewId, messageId)
    return {
      ok: true,
      to: recipient,
      from: row.from_email,
      templateId,
      subject,
      previewId,
      messageId,
      emailProviderId: row.id,
      deliveryNote:
        'SendGrid accepted the message. Delivery can take 1–5 minutes. Check spam/junk and SendGrid → Activity if nothing arrives.',
    }
  } catch (err) {
    const detail = err?.response?.body?.errors?.[0]?.message || err.message || 'SendGrid rejected the message'
    const hint =
      /sender identity|verified sender/i.test(detail)
        ? `${detail} Verify this From address under SendGrid → Settings → Sender Authentication.`
        : detail
    throw httpError(400, hint)
  }
}

export async function getTestRecipientEmailsForProvider(emailProviderId) {
  const recipients = await listDistinctTestRecipientEmails(30, emailProviderId)
  return { recipients }
}