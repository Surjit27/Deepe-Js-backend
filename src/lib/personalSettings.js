/** Canonical personal settings shape stored on users.personal_settings. */
export const PERSONAL_SETTINGS_DEFAULTS = {
  ui: {
    timezone: 'UTC',
    compactSidebar: false,
  },
  notifications: {
    emailDigest: true,
    jobFailures: true,
  },
}

const TIMEZONE_PATTERN = /^[A-Za-z0-9/_+\-]+$/

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function pickBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function pickTimezone(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const tz = value.trim()
  if (tz.length > 64 || !TIMEZONE_PATTERN.test(tz)) return fallback
  return tz
}

export function normalizePersonalSettings(raw) {
  const source = isPlainObject(raw) ? raw : {}
  const uiSrc = isPlainObject(source.ui) ? source.ui : {}
  const notifySrc = isPlainObject(source.notifications) ? source.notifications : {}

  return {
    ui: {
      timezone: pickTimezone(uiSrc.timezone, PERSONAL_SETTINGS_DEFAULTS.ui.timezone),
      compactSidebar: pickBoolean(uiSrc.compactSidebar, PERSONAL_SETTINGS_DEFAULTS.ui.compactSidebar),
    },
    notifications: {
      emailDigest: pickBoolean(notifySrc.emailDigest, PERSONAL_SETTINGS_DEFAULTS.notifications.emailDigest),
      jobFailures: pickBoolean(notifySrc.jobFailures, PERSONAL_SETTINGS_DEFAULTS.notifications.jobFailures),
    },
  }
}

/** Deep-merge a partial patch onto existing settings, then normalize. */
export function mergePersonalSettings(current, patch) {
  const base = normalizePersonalSettings(current)
  if (!isPlainObject(patch)) return base

  const next = structuredClone(base)
  if (isPlainObject(patch.ui)) {
    if (patch.ui.timezone !== undefined) {
      next.ui.timezone = pickTimezone(patch.ui.timezone, next.ui.timezone)
    }
    if (patch.ui.compactSidebar !== undefined) {
      next.ui.compactSidebar = pickBoolean(patch.ui.compactSidebar, next.ui.compactSidebar)
    }
  }
  if (isPlainObject(patch.notifications)) {
    if (patch.notifications.emailDigest !== undefined) {
      next.notifications.emailDigest = pickBoolean(
        patch.notifications.emailDigest,
        next.notifications.emailDigest,
      )
    }
    if (patch.notifications.jobFailures !== undefined) {
      next.notifications.jobFailures = pickBoolean(
        patch.notifications.jobFailures,
        next.notifications.jobFailures,
      )
    }
  }
  return normalizePersonalSettings(next)
}