import { Router } from 'express'
import { authenticate, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import {
  createCredential,
  getGitAccessStatus,
  getRepo,
  listCredentials,
  listRepos,
  removeCredential,
  updateCredential,
  verifyCredential,
  verifyGitAccess,
} from '../services/clientGit.service.js'

export const clientGitRouter = Router()

const clientOnly = [authenticate, requireRoleMatchesPortal, requireRole('client')]

clientGitRouter.get('/git/status', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await getGitAccessStatus(req.auth.userId))
  } catch (err) {
    next(err)
  }
})

clientGitRouter.get('/git/credentials', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await listCredentials(req.auth.userId))
  } catch (err) {
    next(err)
  }
})

clientGitRouter.post('/git/credentials', ...clientOnly, async (req, res, next) => {
  try {
    const payload = await createCredential(req.auth.userId, req.body ?? {})
    res.status(201).json(payload)
  } catch (err) {
    next(err)
  }
})

clientGitRouter.patch('/git/credentials/:id', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await updateCredential(req.auth.userId, req.params.id, req.body ?? {}))
  } catch (err) {
    next(err)
  }
})

clientGitRouter.delete('/git/credentials/:id', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await removeCredential(req.auth.userId, req.params.id))
  } catch (err) {
    next(err)
  }
})

clientGitRouter.post('/git/credentials/:id/verify', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await verifyCredential(req.auth.userId, req.params.id))
  } catch (err) {
    next(err)
  }
})

clientGitRouter.post('/git/verify', ...clientOnly, async (req, res, next) => {
  try {
    const credentialId = req.body?.credentialId ?? req.query?.credentialId
    res.json(await verifyGitAccess(req.auth.userId, { credentialId }))
  } catch (err) {
    next(err)
  }
})

clientGitRouter.get('/git/repos', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await listRepos(req.auth.userId, req.query ?? {}))
  } catch (err) {
    next(err)
  }
})

clientGitRouter.get('/git/repos/:owner/:repo', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await getRepo(req.auth.userId, req.params.owner, req.params.repo, req.query ?? {}))
  } catch (err) {
    next(err)
  }
})
