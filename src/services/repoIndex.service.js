import { migrateClientSchemaIfNeeded } from '../db/clientSchema/provision.js'
import { decryptSecret } from '../lib/secretBox.js'
import { findConnectedRepoById } from '../repositories/clientGitConnectedRepos.repository.js'
import { findGitCredentialById, findDefaultGitCredential } from '../repositories/clientGitCredentials.repository.js'
import {
  findRepoCodeGraph,
  insertRepoIndexJob,
  listRepoCodeGraphs,
  markRepoIndexJob,
  upsertRepoCodeGraph,
} from '../repositories/repoIndex.repository.js'
import { findUserById } from '../repositories/users.repository.js'
import { recordClientActivity } from './clientHistory.service.js'
import { env } from '../config/env.js'
import {
  getGitHubBranchSha,
  getGitHubCommitTreeSha,
  getGitHubRecursiveTree,
  getGitHubRepo,
} from './githubApi.service.js'
import { buildGraphFromTree, enrichGraphWithSymbols } from './repoGraphBuilder.js'
import { enqueueRepoIndexJob, repoIndexQueueEnabled } from '../jobs/repoIndexRunner.js'

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function tenantSchemaUserId(userRow) {
  return userRow.tenant_owner_id || userRow.id
}

async function assertClientActor(userId) {
  const actor = await findUserById(userId)
  if (!actor || actor.role !== 'client') throw httpError(403, 'Client portal required')
  return { actor, schemaUserId: tenantSchemaUserId(actor) }
}

async function resolveToken(schemaUserId, credentialId) {
  if (credentialId) {
    const row = await findGitCredentialById(schemaUserId, credentialId)
    if (!row?.token_cipher) throw httpError(400, 'Git credential token missing')
    const token = decryptSecret(row.token_cipher)
    if (!token) throw httpError(400, 'Invalid stored token')
    return token
  }
  const envToken = env.github?.token
  if (envToken) return envToken
  const row = await findDefaultGitCredential(schemaUserId)
  if (row?.token_cipher) {
    const token = decryptSecret(row.token_cipher)
    if (token) return token
  }
  throw httpError(400, 'No GitHub token available for indexing')
}

export async function runRepoIndex(schemaUserId, connectedRepoId, jobId) {
  const repoRow = await findConnectedRepoById(schemaUserId, connectedRepoId)
  if (!repoRow) throw httpError(404, 'Connected repo not found')

  const [owner, name] = String(repoRow.full_name).split('/')
  if (!owner || !name) throw httpError(400, 'Invalid full_name on connected repo')

  if (jobId) {
    await markRepoIndexJob(schemaUserId, jobId, {
      status: 'running',
      startedAt: new Date(),
      error: '',
    })
  }

  try {
    const token = await resolveToken(schemaUserId, repoRow.git_credential_id)
    const branch = repoRow.default_branch || 'main'
    await getGitHubRepo(token, owner, name)
    const commitSha = await getGitHubBranchSha(token, owner, name, branch)
    const treeSha = await getGitHubCommitTreeSha(token, owner, name, commitSha)
    const { entries, truncated } = await getGitHubRecursiveTree(token, owner, name, treeSha)
    const built = buildGraphFromTree(repoRow, branch, commitSha, entries)
    const { symbolCount } = await enrichGraphWithSymbols(
      { ...built, meta: { branch, commitSha } },
      token,
      owner,
      name,
    )
    const graph = built.root
    if (truncated) graph._truncated = true

    await upsertRepoCodeGraph(schemaUserId, {
      connectedRepoId,
      branch,
      commitSha,
      graph,
      fileCount: built.meta.fileCount,
      symbolCount,
    })

    if (jobId) {
      await markRepoIndexJob(schemaUserId, jobId, {
        status: 'success',
        finishedAt: new Date(),
      })
    }

    await recordClientActivity(schemaUserId, {
      domain: 'job',
      action: 'repo_index_success',
      subjectId: connectedRepoId,
      subjectLabel: repoRow.full_name,
      metadata: { fileCount: built.meta.fileCount, symbolCount, branch },
    })

    return {
      connectedRepoId,
      branch,
      commitSha,
      fileCount: built.meta.fileCount,
      symbolCount,
      truncated,
    }
  } catch (err) {
    if (jobId) {
      await markRepoIndexJob(schemaUserId, jobId, {
        status: 'failed',
        error: String(err.message ?? err).slice(0, 2000),
        finishedAt: new Date(),
      })
    }
    await recordClientActivity(schemaUserId, {
      domain: 'job',
      action: 'repo_index_failed',
      subjectId: connectedRepoId,
      subjectLabel: repoRow.full_name,
      metadata: { error: String(err.message ?? err).slice(0, 500) },
    }).catch(() => {})
    throw err
  }
}

export async function queueRepoIndex(userId, connectedRepoId) {
  const { schemaUserId } = await assertClientActor(userId)
  await migrateClientSchemaIfNeeded(schemaUserId)
  const repoRow = await findConnectedRepoById(schemaUserId, connectedRepoId)
  if (!repoRow) throw httpError(404, 'Connected repo not found')

  const jobRow = await insertRepoIndexJob(schemaUserId, connectedRepoId)

  if (repoIndexQueueEnabled()) {
    await enqueueRepoIndexJob({ schemaUserId, connectedRepoId, jobId: jobRow.id })
    return { jobId: jobRow.id, status: 'queued', async: true }
  }

  const result = await runRepoIndex(schemaUserId, connectedRepoId, jobRow.id)
  return { jobId: jobRow.id, status: 'success', async: false, result }
}

export async function getRepoGraph(userId, connectedRepoId) {
  const { schemaUserId } = await assertClientActor(userId)
  await migrateClientSchemaIfNeeded(schemaUserId)
  const row = await findRepoCodeGraph(schemaUserId, connectedRepoId)
  if (!row) throw httpError(404, 'No index for this repo — POST index first')
  return {
    connectedRepoId: row.connected_repo_id,
    branch: row.branch,
    commitSha: row.commit_sha,
    fileCount: row.file_count,
    symbolCount: row.symbol_count,
    indexedAt: row.indexed_at,
    graph: row.graph,
  }
}

export async function listRepoGraphs(userId, ids) {
  const { schemaUserId } = await assertClientActor(userId)
  await migrateClientSchemaIfNeeded(schemaUserId)
  const uuidList = (ids ?? []).map(String).filter(Boolean)
  const rows = await listRepoCodeGraphs(schemaUserId, uuidList)
  return {
    graphs: rows.map((row) => ({
      connectedRepoId: row.connected_repo_id,
      branch: row.branch,
      commitSha: row.commit_sha,
      fileCount: row.file_count,
      symbolCount: row.symbol_count,
      indexedAt: row.indexed_at,
      graph: row.graph,
    })),
  }
}
