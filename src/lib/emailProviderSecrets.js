import { env } from '../config/env.js'
import { decryptSecret } from './secretBox.js'

export function resolvedSendGridApiKey(row) {
  const saved = decryptSecret(row?.api_key_cipher)
  if (saved) return { apiKey: saved, source: 'saved' }
  if (env.sendgridApiKey) return { apiKey: env.sendgridApiKey, source: 'env' }
  return { apiKey: '', source: 'none' }
}