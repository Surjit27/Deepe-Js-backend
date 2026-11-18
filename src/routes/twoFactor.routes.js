import { Router } from 'express'
import { authenticate, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { AUDIT_ACTION, AUDIT_DOMAIN, recordAuditEvent } from '../audit/index.js'
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
} from '../services/accountSecurity.service.js'
import { completeTwoFactorLogin } from '../services/auth.service.js'

export const twoFactorRouter = Router()

const signedIn = [authenticate, requireRoleMatchesPortal]
const twoFactorLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 24, name: 'two-factor' })
const loginTwoFactorLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 16, name: 'login-two-factor' })

twoFactorRouter.post('/two-factor/setup', twoFactorLimiter, ...signedIn, async (req, res, next) => {
  try {
    const setup = await beginTwoFactorSetup(req.auth.userId, req.auth.email ?? req.user?.email)
    res.json({ setup })
  } catch (err) {
    next(err)
  }
})

twoFactorRouter.post('/two-factor/enable', twoFactorLimiter, ...signedIn, async (req, res, next) => {
  try {
    const code = req.body?.code
    if (!code) return res.status(400).json({ error: 'code is required' })
    const result = await confirmTwoFactorSetup(req.auth.userId, code)
    recordAuditEvent({
      domain: AUDIT_DOMAIN.USER,
      action: AUDIT_ACTION.TWO_FACTOR_ENABLED,
      actorUserId: req.auth.userId,
      subjectId: req.auth.userId,
      subjectLabel: req.auth.email ?? '',
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

twoFactorRouter.post('/two-factor/disable', twoFactorLimiter, ...signedIn, async (req, res, next) => {
  try {
    const { password, code } = req.body ?? {}
    if (!password || !code) {
      return res.status(400).json({ error: 'password and code are required' })
    }
    const result = await disableTwoFactor(req.auth.userId, { password, code })
    recordAuditEvent({
      domain: AUDIT_DOMAIN.USER,
      action: AUDIT_ACTION.TWO_FACTOR_DISABLED,
      actorUserId: req.auth.userId,
      subjectId: req.auth.userId,
      subjectLabel: req.auth.email ?? '',
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

twoFactorRouter.post('/two-factor/verify-login', loginTwoFactorLimiter, async (req, res, next) => {
  try {
    const { pendingToken, code } = req.body ?? {}
    if (!pendingToken || !code) {
      return res.status(400).json({ error: 'pendingToken and code are required' })
    }
    const result = await completeTwoFactorLogin(pendingToken, code, req)
    res.json(result)
  } catch (err) {
    next(err)
  }
})
