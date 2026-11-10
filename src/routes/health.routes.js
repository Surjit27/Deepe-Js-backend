import { Router } from 'express'
import { databasesHealth } from '../db/index.js'

export const healthRouter = Router()

healthRouter.get('/health', async (_req, res) => {
  const databases = await databasesHealth()
  const allOk = databases.postgres.ok && databases.mongo.ok

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    databases,
  })
})

healthRouter.get('/ready', async (_req, res) => {
  const databases = await databasesHealth()
  const ready = databases.postgres.ok && databases.mongo.ok
  res.status(ready ? 200 : 503).json({
    ready,
    timestamp: new Date().toISOString(),
    databases,
  })
})
