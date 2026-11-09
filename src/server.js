import { createApp } from './app.js'
import { env } from './config/env.js'
import { closeDatabases, connectDatabases } from './db/index.js'
import { runMigrations } from './db/migrate.js'
import { applyPrismaMigrations } from './db/prisma.js'
import { seedAdminUser, seedClientAccessRoles } from './db/seed.js'
import { startJobRunner, stopJobRunner } from './jobs/runner.js'
import { startRepoIndexRunner, stopRepoIndexRunner } from './jobs/repoIndexRunner.js'

async function main() {
  await applyPrismaMigrations()
  await connectDatabases()
  await runMigrations()
  await seedAdminUser()
  await seedClientAccessRoles()
  console.log('[db] PostgreSQL and MongoDB connected')
  await startJobRunner(env.redisUrl)
  await startRepoIndexRunner(env.redisUrl)

  const app = createApp()
  const server = app.listen(env.port, () => {
    console.log(`[server] listening on http://127.0.0.1:${env.port}`)
  })

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} — shutting down`)
    server.close(async () => {
      await stopJobRunner()
      await stopRepoIndexRunner()
      await closeDatabases()
      process.exit(0)
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('[server] failed to start', err)
  process.exit(1)
})
