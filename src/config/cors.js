/**
 * @param {string | undefined} origin
 * @param {string[]} allowList
 * @param {boolean} isProd
 */
export function isCorsOriginAllowed(origin, allowList, isProd) {
  if (!origin) return true
  if (allowList.includes(origin)) return true

  if (isProd) return false

  try {
    const url = new URL(origin)
    const host = url.hostname.toLowerCase()
    const okHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.localhost') ||
      host.endsWith('.localhost.com') ||
      host === 'client.localhost' ||
      host === 'admin.localhost' ||
      host === 'home.localhost'
    const okPort = url.port === '' || url.port === '5173' || url.port === '4173'
    return okHost && okPort && url.protocol === 'http:'
  } catch {
    return false
  }
}
