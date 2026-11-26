import { Router } from 'express'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { AUDIT_ACTION, AUDIT_DOMAIN, recordAuditEvent } from '../audit/index.js'
import {
  getEmailSettings,
  getEmailTemplatesCatalog,
  getStoredEmailPreview,
  getTestRecipientEmails,
  previewEmailTemplate,
  sendTestEmail,
  updateEmailSettings,
} from '../services/emailSettings.service.js'

export const emailSettingsRouter = Router()

const adminOnly = [authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal]

emailSettingsRouter.get('/email/templates', ...adminOnly, async (_req, res, next) => {
  try {
    res.json({ templates: getEmailTemplatesCatalog() })
  } catch (err) {
    next(err)
  }
})

emailSettingsRouter.get('/email/previews/:id', ...adminOnly, async (req, res, next) => {
  try {
    res.json({ preview: await getStoredEmailPreview(req.params.id) })
  } catch (err) {
    next(err)
  }
})

emailSettingsRouter.post('/email/preview', ...adminOnly, async (req, res, next) => {
  try {
    const body = req.body ?? {}
    const preview = await previewEmailTemplate(body.templateId ?? undefined, body.variables, {
      actorUserId: req.auth.userId,
    })
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_PREVIEW_SAVED,
      actorUserId: req.auth.userId,
      subjectLabel: preview.subject,
      metadata: {
        previewId: preview.previewId,
        templateId: preview.templateId,
        subject: preview.subject,
      },
    })
    res.json({ preview })
  } catch (err) {
    next(err)
  }
})

emailSettingsRouter.get('/email/test-recipients', ...adminOnly, async (_req, res, next) => {
  try {
    res.json(await getTestRecipientEmails())
  } catch (err) {
    next(err)
  }
})

emailSettingsRouter.get('/email', ...adminOnly, async (_req, res, next) => {
  try {
    res.json({ email: await getEmailSettings() })
  } catch (err) {
    next(err)
  }
})

emailSettingsRouter.put('/email', ...adminOnly, async (req, res, next) => {
  try {
    const email = await updateEmailSettings(req.body ?? {})
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_SETTINGS_UPDATED,
      actorUserId: req.auth.userId,
      subjectLabel: email.fromEmail || 'email settings',
      metadata: { enabled: email.enabled, fromEmail: email.fromEmail },
    })
    res.json({ email })
  } catch (err) {
    next(err)
  }
})

emailSettingsRouter.post('/email/test', ...adminOnly, async (req, res, next) => {
  try {
    const result = await sendTestEmail(req.body?.to, {
      templateId: req.body?.templateId,
      recipientName: req.body?.recipientName,
      variables: req.body?.variables,
      actorUserId: req.auth.userId,
    })
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_TEST_SENT,
      actorUserId: req.auth.userId,
      subjectLabel: result.to,
      metadata: {
        previewId: result.previewId,
        templateId: result.templateId,
        subject: result.subject,
        messageId: result.messageId,
        request: { to: result.to, templateId: result.templateId },
        response: { messageId: result.messageId, previewId: result.previewId },
      },
    })
    res.json(result)
  } catch (err) {
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_TEST_FAILED,
      actorUserId: req.auth?.userId,
      subjectLabel: String(req.body?.to ?? ''),
      metadata: { error: err.message },
    })
    next(err)
  }
})
