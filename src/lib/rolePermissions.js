/** Admin portal sidebar / settings permissions (catalog roles with portal = admin). */
export const ADMIN_PAGE_PERMISSIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'roles', label: 'Roles' },
  { key: 'client_users', label: 'Client user management' },
  { key: 'admin_users', label: 'Admin user management' },
  { key: 'history', label: 'User / email / job history' },
  { key: 'settings', label: 'Settings (personal)' },
  { key: 'settings.email', label: 'Settings — Email' },
  { key: 'settings.api', label: 'Settings — API model' },
  { key: 'settings.feature_flags', label: 'Settings — Feature flags' },
]

export const CLIENT_ACCESS_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboards' },
  { key: 'deep_backend', label: 'Deep Backend (GitHub, cloud)' },
  { key: 'access.users', label: 'Access — Users' },
  { key: 'access.roles', label: 'Access — Roles' },
  { key: 'history', label: 'History' },
  { key: 'settings', label: 'Settings' },
]

export const ALL_ADMIN_PERMISSION_KEYS = ADMIN_PAGE_PERMISSIONS.map((p) => p.key)
export const ALL_CLIENT_ACCESS_PERMISSION_KEYS = CLIENT_ACCESS_PERMISSIONS.map((p) => p.key)

export const DEFAULT_SUPER_ADMIN_PERMISSIONS = [...ALL_CLIENT_ACCESS_PERMISSION_KEYS]
export const DEFAULT_MEMBER_PERMISSIONS = ['dashboard', 'deep_backend', 'settings']

export function catalogForPortal(portal) {
  return portal === 'admin' ? ADMIN_PAGE_PERMISSIONS : CLIENT_ACCESS_PERMISSIONS
}

export function defaultPermissionsForPortal(portal, roleKey) {
  if (portal === 'admin') return [...ALL_ADMIN_PERMISSION_KEYS]
  if (roleKey === 'super_admin') return [...DEFAULT_SUPER_ADMIN_PERMISSIONS]
  if (roleKey === 'member') return [...DEFAULT_MEMBER_PERMISSIONS]
  return [...ALL_CLIENT_ACCESS_PERMISSION_KEYS]
}

export function normalizePermissionKeys(portal, keys) {
  const allowed = new Set(catalogForPortal(portal).map((p) => p.key))
  const unique = [...new Set((keys ?? []).map((k) => String(k).trim()).filter(Boolean))]
  const invalid = unique.filter((k) => !allowed.has(k))
  if (invalid.length) {
    const err = new Error(`Unknown permissions: ${invalid.join(', ')}`)
    err.status = 400
    throw err
  }
  return unique
}