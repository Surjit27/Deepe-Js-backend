import { mergePersonalSettings, normalizePersonalSettings } from '../lib/personalSettings.js'
import { readPersonalSettings, writePersonalSettings } from '../repositories/personalSettings.repository.js'

export async function getPersonalSettingsForUser(userId) {
  const raw = await readPersonalSettings(userId)
  return normalizePersonalSettings(raw)
}

export async function updatePersonalSettingsForUser(userId, patch) {
  const current = await getPersonalSettingsForUser(userId)
  const merged = mergePersonalSettings(current, patch)
  const saved = await writePersonalSettings(userId, merged)
  return normalizePersonalSettings(saved)
}