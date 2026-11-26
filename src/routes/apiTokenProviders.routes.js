import { Router } from 'express'
import { authenticate, requireAdminPortal, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { API_TOKEN_PROVIDER_TYPES } from '../lib/providerCatalog.js'
import { aiWorkerFetch } from '../lib/aiWorkerClient.js'

export const apiTokenProvidersRouter = Router()

const adminOnly = [authenticate, requireRoleMatchesPortal, requireRole('admin'), requireAdminPortal]

apiTokenProvidersRouter.get('/api-token-types', ...adminOnly, (_req, res) => {
  res.json({ types: API_TOKEN_PROVIDER_TYPES, storageNote: 'Keys are stored in the Python AI worker database (schema ai).' })
})

apiTokenProvidersRouter.get('/api-tokens', ...adminOnly, async (_req, res, next) => {
  try {
    res.json(await aiWorkerFetch('/v1/settings/api-tokens'))
  } catch (err) {
    next(err)
  }
})

apiTokenProvidersRouter.post('/api-tokens', ...adminOnly, async (req, res, next) => {
  try {
  res.status(201).json(await aiWorkerFetch('/v1/settings/api-tokens', { method: 'POST', body: req.body ?? {} }))
  } catch (err) {
    next(err)
  }
})

apiTokenProvidersRouter.get('/api-tokens/:id', ...adminOnly, async (req, res, next) => {
  try {
    res.json(await aiWorkerFetch(`/v1/settings/api-tokens/${req.params.id}`))
  } catch (err) {
    next(err)
  }
})

apiTokenProvidersRouter.patch('/api-tokens/:id', ...adminOnly, async (req, res, next) => {
  try {
    res.json(await aiWorkerFetch(`/v1/settings/api-tokens/${req.params.id}`, { method: 'PATCH', body: req.body ?? {} }))
  } catch (err) {
    next(err)
  }
})

apiTokenProvidersRouter.delete('/api-tokens/:id', ...adminOnly, async (req, res, next) => {
  try {
    res.json(await aiWorkerFetch(`/v1/settings/api-tokens/${req.params.id}`, { method: 'DELETE' }))
  } catch (err) {
    next(err)
  }
})