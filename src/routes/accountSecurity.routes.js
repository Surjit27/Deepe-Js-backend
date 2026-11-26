import { Router } from 'express'
import { authenticate, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { AUDIT_ACTION, AUDIT_DOMAIN, recordAuditEvent } from '../audit/index.js'
import {
  changeAccountPassword,
  getAccountSecuritySummary,
} from '../services/accountSecurity.service.js'

export const accountSecurityRouter = Router()

const signedIn = [authenticate, requireRoleMatchesPortal]
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, name: 'password-change' })

accountSecurityRouter.get('/security', ...signedIn, async (req, res, next) => {
  try {
    const security = await getAccountSecuritySummary(req.auth.userId)
    res.json({ security })
  } catch (err) {
    next(err)
  }
})

accountSecurityRouter.post('/password', passwordLimiter, ...signedIn, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {}
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' })
    }
    await changeAccountPassword(req.auth.userId, currentPassword, newPassword)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.USER,
      action: AUDIT_ACTION.PASSWORD_CHANGED,
      actorUserId: req.auth.userId,
      subjectId: req.auth.userId,
      subjectLabel: req.auth.email ?? '',
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})