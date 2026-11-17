export function maskSendGridKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('SG.')) return null
  const tail = apiKey.slice(-4)
  return `SG.${'•'.repeat(12)}${tail}`
}

export function maskGenericApiKey(apiKey) {
  if (!apiKey) return null
  const trimmed = String(apiKey).trim()
  if (trimmed.length <= 8) return '•'.repeat(trimmed.length)
  return `${'•'.repeat(Math.min(12, trimmed.length - 4))}${trimmed.slice(-4)}`
}