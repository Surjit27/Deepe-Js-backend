import { Router } from 'express'
import { authenticate, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { AUDIT_DOMAIN } from '../audit/index.js'
import { getStoredEmailPreview } from '../services/emailSettings.service.js'
import { listClientHistory } from '../services/clientHistory.service.js'

export const clientHistoryRouter = Router()

const clientOnly = [authenticate, requireRoleMatchesPortal, requireRole('client')]

function historyHandler(domain) {
  return async (req, res, next) => {
    try {
      res.json(await listClientHistory(req.auth.userId, domain, req.query))
    } catch (err) {
      next(err)
    }
  }
}

clientHistoryRouter.get('/history/email-previews/:id', ...clientOnly, async (req, res, next) => {
  try {
    res.json({ preview: await getStoredEmailPreview(req.params.id) })
  } catch (err) {
    next(err)
  }
})

clientHistoryRouter.get('/history/users', ...clientOnly, historyHandler(AUDIT_DOMAIN.USER))
clientHistoryRouter.get('/history/emails', ...clientOnly, historyHandler(AUDIT_DOMAIN.EMAIL))
clientHistoryRouter.get('/history/jobs', ...clientOnly, historyHandler(AUDIT_DOMAIN.JOB))
