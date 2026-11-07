import { Router } from 'express'
import { authenticate, requireRole, requireRoleMatchesPortal } from '../middleware/auth.middleware.js'
import {
  completeGitHubOAuthCallback,
  completeGitHubOAuthCallbackWithError,
  createCredential,
  getGitAccessStatus,
  getRepo,
  listCredentialRepositories,
  listCredentials,
  listRepos,
  removeCredential,
  startGitHubOAuth,
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

clientGitRouter.get('/git/credentials/:id/repositories', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await listCredentialRepositories(req.auth.userId, req.params.id, req.query ?? {}))
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

clientGitRouter.post('/git/oauth/start', ...clientOnly, async (req, res, next) => {
  try {
    res.json(await startGitHubOAuth(req.auth.userId))
  } catch (err) {
    next(err)
  }
})

/** Public callback — identity comes from signed `state`, not JWT. */
clientGitRouter.get('/git/oauth/callback', async (req, res, next) => {
  try {
    const code = req.query?.code
    const state = req.query?.state
    if (!code || !state) {
      const redirect = await completeGitHubOAuthCallbackWithError('Missing authorization code')
      return res.redirect(redirect)
    }
    const redirect = await completeGitHubOAuthCallback(String(code), String(state))
    res.redirect(redirect)
  } catch (err) {
    try {
      const redirect = await completeGitHubOAuthCallbackWithError(err.message ?? 'GitHub sign-in failed')
      res.redirect(redirect)
    } catch (e) {
      next(e)
    }
  }
})
