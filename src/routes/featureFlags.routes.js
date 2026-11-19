import { Router } from 'express'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import {
  adminClearClientOverride,
  adminCreateFeatureFlag,
  adminListFeatureFlags,
  adminPatchFeatureFlag,
  adminSetClientOverride,
  resolveClientFeatureFlags,
} from '../services/featureFlags.service.js'

export const adminFeatureFlagsRouter = Router()
export const clientFeatureFlagsRouter = Router()

const adminOnly = [authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal]
const clientOnly = [authenticate, requireRoleMatchesPortal, requireRole('client')]

adminFeatureFlagsRouter.get('/feature-flags', ...adminOnly, async (_req, res, next) => {
  try {
    res.json(await adminListFeatureFlags())
  } catch (err) {
    next(err)
  }
})

adminFeatureFlagsRouter.post('/feature-flags', ...adminOnly, async (req, res, next) => {
  try {
    const flag = await adminCreateFeatureFlag(req.body ?? {})
    res.status(201).json({ flag })
  } catch (err) {
    next(err)
  }
})

adminFeatureFlagsRouter.patch('/feature-flags/:key', ...adminOnly, async (req, res, next) => {
  try {
    const flag = await adminPatchFeatureFlag(req.params.key, req.body ?? {})
    res.json({ flag })
  } catch (err) {
    next(err)
  }
})

adminFeatureFlagsRouter.put('/feature-flags/:key/clients/:clientUserId', ...adminOnly, async (req, res, next) => {
  try {
    const result = await adminSetClientOverride(req.params.clientUserId, req.params.key, req.body?.enabled)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

adminFeatureFlagsRouter.delete('/feature-flags/:key/clients/:clientUserId', ...adminOnly, async (req, res, next) => {
  try {
    res.json(await adminClearClientOverride(req.params.clientUserId, req.params.key))
  } catch (err) {
    next(err)
  }
})

clientFeatureFlagsRouter.get('/feature-flags', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await resolveClientFeatureFlags(req.auth.userId))
  } catch (err) {
    next(err)
  }
})