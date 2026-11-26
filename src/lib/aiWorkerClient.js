import { env } from '../config/env.js'

function workerHeaders() {
  const headers = { Accept: 'application/json' }
  if (env.internalApiKey) headers['X-Internal-Key'] = env.internalApiKey
  return headers
}

export async function aiWorkerFetch(path, { method = 'GET', body } = {}) {
  const url = `${env.pythonBackendUrl}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method,
    headers: {
      ...workerHeaders(),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }
  if (!res.ok) {
    const message = payload?.detail || payload?.message || payload?.error || text || `AI worker HTTP ${res.status}`
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message))
    err.status = res.status
    throw err
  }
  return payload
}