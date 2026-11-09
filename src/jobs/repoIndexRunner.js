import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { runRepoIndex } from '../services/repoIndex.service.js'

const QUEUE_NAME = 'aazhi-repo-index'

let queue
let worker
const openConnections = []

function connection(url) {
  const client = new IORedis(url, { maxRetriesPerRequest: null })
  openConnections.push(client)
  return client
}

export function repoIndexQueueEnabled() {
  return Boolean(queue)
}

export async function enqueueRepoIndexJob(payload) {
  if (!queue) {
    const err = new Error('Redis is not running — index runs inline when queue is unavailable')
    err.status = 503
    throw err
  }
  await queue.add('index', payload, { removeOnComplete: 100, removeOnFail: 50 })
}

async function processIndex(job) {
  const { schemaUserId, connectedRepoId, jobId } = job.data ?? {}
  if (!schemaUserId || !connectedRepoId) {
    throw new Error('Invalid repo index job payload')
  }
  return runRepoIndex(schemaUserId, connectedRepoId, jobId)
}

export async function startRepoIndexRunner(redisUrl) {
  if (!redisUrl || queue) return repoIndexQueueEnabled()
  const probe = new IORedis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  })
  try {
    await probe.connect()
    await probe.ping()
  } catch {
    probe.disconnect()
    return false
  }
  probe.disconnect()

  queue = new Queue(QUEUE_NAME, { connection: connection(redisUrl) })
  worker = new Worker(QUEUE_NAME, processIndex, { connection: connection(redisUrl) })
  worker.on('failed', (job, err) => {
    console.error('[repo-index] failed', job?.id, err.message)
  })
  console.log(`[repo-index] BullMQ listening on ${redisUrl}`)
  return true
}

export async function stopRepoIndexRunner() {
  await Promise.race([
    Promise.all([worker?.close(), queue?.close()]),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ])
  for (const client of openConnections) client.disconnect()
  openConnections.length = 0
  queue = undefined
  worker = undefined
}
