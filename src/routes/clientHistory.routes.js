import { Router } from 'express'
import { authenticate, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { AUDIT_DOMAIN } from '../audit/index.js'
import { listClientHistory } from '../services/clientHistory.service.js'

export const clientHistoryRouter = Router()

const clientOnly = [authenticate, requireRoleMatchesPortal, requireRole('client')]

function historyHandler(domain) {
  return async (req, res, next) => {
    try {
      const limit = typeof req.query.limit === 'string' ? req.query.limit : undefined
      const offset = typeof req.query.offset === 'string' ? req.query.offset : undefined
      res.json(await listClientHistory(req.auth.userId, domain, { limit, offset }))
    } catch (err) {
      next(err)
    }
  }
}

clientHistoryRouter.get('/history/users', ...clientOnly, historyHandler(AUDIT_DOMAIN.USER))
clientHistoryRouter.get('/history/emails', ...clientOnly, historyHandler(AUDIT_DOMAIN.EMAIL))
clientHistoryRouter.get('/history/jobs', ...clientOnly, historyHandler(AUDIT_DOMAIN.JOB))
