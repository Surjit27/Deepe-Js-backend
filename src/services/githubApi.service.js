const GITHUB_API = 'https://api.github.com'

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Deepe-Js-backend',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function githubFetch(path, token, { method = 'GET', query } = {}) {
  const url = new URL(`${GITHUB_API}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url, { method, headers: headers(token) })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { message: text }
  }
  if (!res.ok) {
    const err = new Error(body?.message ?? `GitHub API ${res.status}`)
    err.status = res.status === 401 || res.status === 403 ? 403 : 502
    err.githubStatus = res.status
    throw err
  }
  return body
}

export async function verifyGitHubToken(token) {
  const user = await githubFetch('/user', token)
  let emails = []
  try {
    const list = await githubFetch('/user/emails', token)
    if (Array.isArray(list)) {
      emails = list.map((e) => ({ email: e.email, primary: e.primary, verified: e.verified }))
    }
  } catch {
    /* fine-grained or missing scope */
  }
  return {
    login: user.login,
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? '',
    emails,
    avatarUrl: user.avatar_url ?? '',
  }
}

export async function listGitHubRepos(token, { page = 1, perPage = 30, sort = 'updated' } = {}) {
  const safePage = Math.min(Math.max(Number(page) || 1, 1), 10)
  const safePerPage = Math.min(Math.max(Number(perPage) || 30, 1), 100)
  const repos = await githubFetch('/user/repos', token, {
    query: {
      page: safePage,
      per_page: safePerPage,
      sort,
      direction: 'desc',
      visibility: 'all',
    },
  })
  if (!Array.isArray(repos)) return { repos: [] }
  return {
    repos: repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      defaultBranch: r.default_branch,
      htmlUrl: r.html_url,
      description: r.description ?? '',
      language: r.language ?? '',
      updatedAt: r.updated_at,
      permissions: r.permissions ?? {},
    })),
  }
}

export function repoAccessLabel(permissions = {}) {
  if (permissions.admin) return 'admin'
  if (permissions.push) return 'write'
  if (permissions.pull) return 'read'
  return 'none'
}

export async function getGitHubRepo(token, owner, repo) {
  const r = await githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token)
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    defaultBranch: r.default_branch,
    htmlUrl: r.html_url,
    description: r.description ?? '',
    language: r.language ?? '',
    permissions: r.permissions ?? {},
    updatedAt: r.updated_at,
  }
}
