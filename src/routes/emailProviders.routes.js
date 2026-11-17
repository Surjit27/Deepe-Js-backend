import { Router } from 'express'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import {
  createEmailProvider,
  getEmailProviderPublic,
  getEmailProviderTypesCatalog,
  listEmailProvidersPublic,
  patchEmailProvider,
  previewEmailForProvider,
  removeEmailProvider,
  sendTestEmailForProvider,
} from '../services/emailProvider.service.js'
import { getTestRecipientEmailsForProvider } from '../services/emailDelivery.service.js'
import { AUDIT_ACTION, AUDIT_DOMAIN, recordAuditEvent } from '../audit/index.js'

export const emailProvidersRouter = Router()

const adminOnly = [authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal]

emailProvidersRouter.get('/email-provider-types', ...adminOnly, (_req, res) => {
  res.json({ types: getEmailProviderTypesCatalog() })
})

emailProvidersRouter.get('/email-providers', ...adminOnly, async (_req, res, next) => {
  try {
    res.json({ providers: await listEmailProvidersPublic() })
  } catch (err) {
    next(err)
  }
})

emailProvidersRouter.post('/email-providers', ...adminOnly, async (req, res, next) => {
  try {
    const provider = await createEmailProvider(req.body ?? {})
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_PROVIDER_CREATED,
      actorUserId: req.auth.userId,
      subjectLabel: provider.name,
      metadata: { providerId: provider.id, provider: provider.provider },
    })
    res.status(201).json({ provider })
  } catch (err) {
    next(err)
  }
})

emailProvidersRouter.get('/email-providers/:id', ...adminOnly, async (req, res, next) => {
  try {
    res.json({ provider: await getEmailProviderPublic(req.params.id) })
  } catch (err) {
    next(err)
  }
})

emailProvidersRouter.patch('/email-providers/:id', ...adminOnly, async (req, res, next) => {
  try {
    const provider = await patchEmailProvider(req.params.id, req.body ?? {})
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_SETTINGS_UPDATED,
      actorUserId: req.auth.userId,
      subjectLabel: provider.name,
      metadata: { providerId: provider.id },
    })
    res.json({ provider })
  } catch (err) {
    next(err)
  }
})

emailProvidersRouter.delete('/email-providers/:id', ...adminOnly, async (req, res, next) => {
  try {
    await removeEmailProvider(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

emailProvidersRouter.get('/email-providers/:id/test-recipients', ...adminOnly, async (req, res, next) => {
  try {
    res.json(await getTestRecipientEmailsForProvider(req.params.id))
  } catch (err) {
    next(err)
  }
})

emailProvidersRouter.post('/email-providers/:id/preview', ...adminOnly, async (req, res, next) => {
  try {
    const body = req.body ?? {}
    const preview = await previewEmailForProvider(req.params.id, body.templateId ?? undefined, body.variables, {
      actorUserId: req.auth.userId,
    })
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_PREVIEW_SAVED,
      actorUserId: req.auth.userId,
      subjectLabel: preview.subject,
      metadata: { previewId: preview.previewId, emailProviderId: req.params.id },
    })
    res.json({ preview })
  } catch (err) {
    next(err)
  }
})

emailProvidersRouter.post('/email-providers/:id/test', ...adminOnly, async (req, res, next) => {
  try {
    const body = req.body ?? {}
    const result = await sendTestEmailForProvider(req.params.id, body.to, {
      variables: body.variables,
      recipientName: body.recipientName,
      actorUserId: req.auth.userId,
    })
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_TEST_SENT,
      actorUserId: req.auth.userId,
      subjectLabel: result.to,
      metadata: { emailProviderId: req.params.id, messageId: result.messageId },
    })
    res.json(result)
  } catch (err) {
    recordAuditEvent({
      domain: AUDIT_DOMAIN.EMAIL,
      action: AUDIT_ACTION.EMAIL_TEST_FAILED,
      actorUserId: req.auth?.userId,
      subjectLabel: String(req.body?.to ?? ''),
      metadata: { emailProviderId: req.params.id, error: err.message },
    })
    next(err)
  }
})