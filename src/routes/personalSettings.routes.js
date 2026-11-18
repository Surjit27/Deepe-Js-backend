import { Router } from 'express'
import { authenticate, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { AUDIT_ACTION, AUDIT_DOMAIN, recordAuditEvent } from '../audit/index.js'
import {
  getPersonalSettingsForUser,
  updatePersonalSettingsForUser,
} from '../services/personalSettings.service.js'

export const personalSettingsRouter = Router()

const signedIn = [authenticate, requireRoleMatchesPortal]

personalSettingsRouter.get('/personal-settings', ...signedIn, async (req, res, next) => {
  try {
    const personalSettings = await getPersonalSettingsForUser(req.auth.userId)
    res.json({ personalSettings })
  } catch (err) {
    next(err)
  }
})

personalSettingsRouter.patch('/personal-settings', ...signedIn, async (req, res, next) => {
  try {
    const personalSettings = await updatePersonalSettingsForUser(req.auth.userId, req.body ?? {})
    recordAuditEvent({
      domain: AUDIT_DOMAIN.USER,
      action: AUDIT_ACTION.PERSONAL_SETTINGS_UPDATED,
      actorUserId: req.auth.userId,
      subjectId: req.auth.userId,
      subjectLabel: req.auth.email ?? '',
      metadata: { personalSettings },
    })
    res.json({ personalSettings })
  } catch (err) {
    next(err)
  }
})