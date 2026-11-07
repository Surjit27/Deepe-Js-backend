import { getProfile, revokeAccessToken, verifyAccessToken } from '../services/auth.service.js'

export async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const token = header.slice(7)
    const payload = verifyAccessToken(token)
    req.auth = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
      jti: payload.jti,
      exp: payload.exp,
      impersonatedBy: payload.impersonatedBy ?? null,
      portal: payload.portal || (payload.role === 'admin' ? 'admin' : 'client'),
    }
    req.user = await getProfile(payload.sub)
    if (req.user.role !== payload.role) {
      revokeAccessToken(payload)
      return res.status(401).json({ error: 'Session is no longer valid' })
    }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

function readAppSurface(req) {
  return String(req.headers['x-app-surface'] ?? req.headers['X-App-Surface'] ?? 'client').toLowerCase() ===
    'admin'
    ? 'admin'
    : 'client'
}

/** JWT role must match the portal indicated by X-App-Surface (admin vs client portals). */
export function requireRoleMatchesPortal(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const surface = readAppSurface(req)
  if (req.auth.impersonatedBy && surface !== 'client') {
    return res.status(403).json({ error: 'Impersonation sessions are client-portal only' })
  }
  const portal = req.auth.portal || (req.auth.role === 'admin' ? 'admin' : 'client')
  if (portal !== surface) {
    return res.status(403).json({ error: 'Role does not match app portal' })
  }
  next()
}

/** Mutations on admin-only resources must be called from the admin portal. */
export function requireAdminPortal(req, res, next) {
  if (readAppSurface(req) !== 'admin') {
    return res.status(403).json({ error: 'Admin portal required' })
  }
  next()
}
