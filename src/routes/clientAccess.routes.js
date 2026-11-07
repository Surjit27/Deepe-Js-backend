import { Router } from 'express'
import { authenticate, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { inviteTenantUser, listClientPortalRoles, listTenantUsers } from '../services/clientAccess.service.js'

export const clientAccessRouter = Router()

const clientOnly = [authenticate, requireRoleMatchesPortal, requireRole('client')]

clientAccessRouter.get('/access/roles', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await listClientPortalRoles())
  } catch (err) {
    next(err)
  }
})

clientAccessRouter.get('/access/users', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await listTenantUsers(req.auth.userId))
  } catch (err) {
    next(err)
  }
})

clientAccessRouter.post('/access/users', ...clientOnly, async (req, res, next) => {
  try {
    const payload = await inviteTenantUser(req.auth.userId, req.body ?? {})
    res.status(201).json(payload)
  } catch (err) {
    next(err)
  }
})
