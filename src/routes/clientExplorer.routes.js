import { Router } from 'express'
import { authenticate, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import { getRepoGraph, getRepoIndexStatus, listRepoGraphs, queueRepoIndex } from '../services/repoIndex.service.js'

export const clientExplorerRouter = Router()

const clientOnly = [authenticate, requireRoleMatchesPortal, requireRole('client')]

clientExplorerRouter.post('/explorer/repos/:connectedRepoId/index', ...clientOnly, async (req, res, next) => {
  try {
    const payload = await queueRepoIndex(req.auth.userId, req.params.connectedRepoId)
    res.status(payload.async ? 202 : 200).json(payload)
  } catch (err) {
    next(err)
  }
})

clientExplorerRouter.get('/explorer/repos/:connectedRepoId/index/status', ...clientOnly, async (req, res, next) => {
  try {
    const jobId = req.query.jobId ? Number(req.query.jobId) : undefined
    res.json(await getRepoIndexStatus(req.auth.userId, req.params.connectedRepoId, { jobId }))
  } catch (err) {
    next(err)
  }
})

clientExplorerRouter.get('/explorer/repos/:connectedRepoId/graph', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await getRepoGraph(req.auth.userId, req.params.connectedRepoId))
  } catch (err) {
    next(err)
  }
})

clientExplorerRouter.get('/explorer/graphs', ...clientOnly, async (req, res, next) => {
  try {
    const raw = req.query.ids
    const ids = typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
    res.json(await listRepoGraphs(req.auth.userId, ids))
  } catch (err) {
    next(err)
  }
})
