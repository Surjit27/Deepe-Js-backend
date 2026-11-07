import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token'
const DEFAULT_SCOPES = ['read:user', 'user:email', 'repo']

function oauthConfigured() {
  return Boolean(env.github.clientId && env.github.clientSecret && env.github.oauthRedirectUri)
}

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

export function isGitHubOAuthEnabled() {
  return oauthConfigured()
}

export function createGitHubOAuthState({ userId, tenantSchemaUserId }) {
  return jwt.sign(
    { purpose: 'github_oauth', userId, tenantSchemaUserId },
    env.auth.jwtSecret,
    { expiresIn: '15m' },
  )
}

export function parseGitHubOAuthState(state) {
  try {
    const payload = jwt.verify(String(state), env.auth.jwtSecret)
    if (payload.purpose !== 'github_oauth') throw new Error('Invalid state')
    return payload
  } catch {
    throw httpError(400, 'OAuth state expired or invalid — try connecting again')
  }
}

export function buildGitHubAuthorizeUrl(state) {
  if (!oauthConfigured()) throw httpError(503, 'GitHub sign-in is not configured on the server (GITHUB_CLIENT_ID)')
  const url = new URL(GITHUB_AUTHORIZE)
  url.searchParams.set('client_id', env.github.clientId)
  url.searchParams.set('redirect_uri', env.github.oauthRedirectUri)
  url.searchParams.set('scope', DEFAULT_SCOPES.join(' '))
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeGitHubOAuthCode(code) {
  if (!oauthConfigured()) throw httpError(503, 'GitHub OAuth is not configured')
  const res = await fetch(GITHUB_TOKEN, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.github.clientId,
      client_secret: env.github.clientSecret,
      code: String(code),
      redirect_uri: env.github.oauthRedirectUri,
    }),
  })
  const body = await res.json()
  if (!res.ok || body.error) {
    throw httpError(400, body.error_description || body.error || 'GitHub token exchange failed')
  }
  return {
    accessToken: body.access_token,
    tokenType: body.token_type,
    scope: body.scope ?? DEFAULT_SCOPES.join(','),
  }
}
