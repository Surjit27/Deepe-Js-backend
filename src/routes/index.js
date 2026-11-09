import { Router } from 'express'
import { healthRouter } from './health.routes.js'
import { authRouter } from './auth.routes.js'
import { emailSettingsRouter } from './emailSettings.routes.js'
import { jobTriggersRouter } from './jobTriggers.routes.js'
import { adminHistoryRouter } from './history.routes.js'
import { clientHistoryRouter } from './clientHistory.routes.js'
import { clientAccessRouter } from './clientAccess.routes.js'
import { clientGitRouter } from './clientGit.routes.js'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'

export const apiRouter = Router()

apiRouter.use(healthRouter)
apiRouter.use('/auth', authRouter)
apiRouter.use('/settings', emailSettingsRouter)
apiRouter.use('/settings', jobTriggersRouter)
apiRouter.use('/admin', adminHistoryRouter)
apiRouter.use('/client', clientHistoryRouter)
apiRouter.use('/client', clientAccessRouter)
apiRouter.use('/client', clientGitRouter)

apiRouter.get(
  '/orders',
  authenticate,
  requireRoleMatchesPortal,
  requireRole('admin'),
  requireAdminPortal,
  (_req, res) => {
    res.json({ data: [], message: 'Orders service is restricted to the admin API' })
  },
)

apiRouter.get('/admin/summary', authenticate, requireRoleMatchesPortal, requireRole('admin'), (_req, res) => {
  res.json({ area: 'admin', message: 'Admin-only API surface' })
})

apiRouter.get('/client/summary', authenticate, requireRoleMatchesPortal, requireRole('client'), (_req, res) => {
  res.json({ area: 'client', message: 'Client portal API surface' })
})
