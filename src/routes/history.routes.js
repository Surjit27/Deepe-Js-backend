import { Router } from 'express'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { AUDIT_DOMAIN } from '../audit/index.js'
import { listHistoryByDomain } from '../services/audit.service.js'

export const adminHistoryRouter = Router()

const adminOnly = [authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal]

function historyHandler(domain) {
  return async (req, res, next) => {
    try {
      res.json(await listHistoryByDomain(domain, req.query))
    } catch (err) {
      next(err)
    }
  }
}

adminHistoryRouter.get('/history/users', ...adminOnly, historyHandler(AUDIT_DOMAIN.USER))
adminHistoryRouter.get('/history/emails', ...adminOnly, historyHandler(AUDIT_DOMAIN.EMAIL))
adminHistoryRouter.get('/history/jobs', ...adminOnly, historyHandler(AUDIT_DOMAIN.JOB))
