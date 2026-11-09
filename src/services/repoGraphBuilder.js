import { getGitHubFileText } from './githubApi.service.js'

const SOURCE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.go', '.py'])

function slugId(prefix, path) {
  return `${prefix}-${path.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 120)}`
}

function isSourcePath(path) {
  const lower = path.toLowerCase()
  return [...SOURCE_EXT].some((ext) => lower.endsWith(ext))
}

function parseSymbols(source) {
  const symbols = []
  const uses = new Set()
  const importRe = /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g
  const reqRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  let m
  while ((m = importRe.exec(source))) uses.add(m[1])
  while ((m = reqRe.exec(source))) uses.add(m[1])

  const fnRe = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g
  while ((m = fnRe.exec(source))) {
    symbols.push({ kind: 'function', name: m[1] })
  }
  const arrowRe = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g
  while ((m = arrowRe.exec(source))) {
    symbols.push({ kind: 'function', name: m[1] })
  }
  const constRe = /(?:export\s+)?const\s+([A-Z_][A-Z0-9_]*)\s*=/g
  while ((m = constRe.exec(source))) {
    symbols.push({ kind: 'const', name: m[1] })
  }
  const letRe = /(?:export\s+)?(?:let|var)\s+(\w+)\s*=/g
  while ((m = letRe.exec(source))) {
    symbols.push({ kind: 'let', name: m[1] })
  }

  return { symbols, uses: [...uses] }
}

function resolveImportToFile(importerPath, spec, filePaths) {
  if (spec.startsWith('.')) {
    const dir = importerPath.includes('/') ? importerPath.replace(/\/[^/]+$/, '') : ''
    const joined = `${dir}/${spec}`.replace(/\/\.\//g, '/')
    const normalized = joined
      .split('/')
      .reduce((acc, seg) => {
        if (seg === '..') acc.pop()
        else if (seg !== '.' && seg) acc.push(seg)
        return acc
      }, [])
      .join('/')
    const candidates = [
      normalized,
      `${normalized}.js`,
      `${normalized}.ts`,
      `${normalized}.tsx`,
      `${normalized}/index.js`,
    ]
    return candidates.find((c) => filePaths.has(c)) ?? null
  }
  return null
}

export function buildGraphFromTree(repoRow, branch, commitSha, entries) {
  const blobs = entries.filter((e) => e.type === 'blob')
  const filePaths = new Set(blobs.map((b) => b.path))
  const root = {
    id: `repo-${repoRow.id}`,
    kind: 'repo',
    name: repoRow.name || repoRow.full_name.split('/').pop(),
    path: repoRow.full_name,
    loc: blobs.reduce((n, b) => n + (b.size || 0), 0),
    children: [],
  }

  const dirIndex = new Map()
  dirIndex.set('', root)
  const fileNodes = []

  for (const blob of blobs) {
    const parts = blob.path.split('/')
    let parent = root
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join('/')
      if (!dirIndex.has(dirPath)) {
        const node = {
          id: slugId('dir', dirPath),
          kind: 'dir',
          name: parts[i],
          path: dirPath,
          children: [],
        }
        parent.children.push(node)
        dirIndex.set(dirPath, node)
        parent = node
      } else {
        parent = dirIndex.get(dirPath)
      }
    }
    const fileNode = {
      id: slugId('file', blob.path),
      kind: 'file',
      name: parts.at(-1),
      path: blob.path,
      loc: blob.size || 0,
      children: [],
    }
    parent.children.push(fileNode)
    fileNodes.push(fileNode)
  }

  return {
    root,
    fileNodes,
    filePaths,
    meta: { branch, commitSha, fileCount: blobs.length },
  }
}

export async function enrichGraphWithSymbols({ fileNodes, filePaths, meta }, token, owner, repo) {
  const pathToId = new Map(fileNodes.map((f) => [f.path, f.id]))
  const idToPath = new Map(fileNodes.map((f) => [f.id, f.path]))
  const fileDeps = new Map()

  const targets = fileNodes.filter((f) => isSourcePath(f.path)).slice(0, 48)
  let symbolCount = 0

  for (const file of targets) {
    let source = ''
    try {
      source = await getGitHubFileText(token, owner, repo, file.path, meta.branch)
    } catch {
      continue
    }
    const { symbols, uses } = parseSymbols(source)
    const resolvedUses = []
    for (const spec of uses) {
      const targetPath = resolveImportToFile(file.path, spec, filePaths)
      if (targetPath && pathToId.has(targetPath)) {
        resolvedUses.push(pathToId.get(targetPath))
      }
    }
    if (resolvedUses.length) fileDeps.set(file.id, resolvedUses)

    for (const sym of symbols.slice(0, 40)) {
      const symId = slugId(`sym-${sym.kind}`, `${file.path}:${sym.name}`)
      file.children.push({
        id: symId,
        kind: sym.kind,
        name: sym.name,
        scope: 'module',
        uses: [],
        usedBy: [],
      })
      symbolCount += 1
    }
  }

  for (const [fromFileId, toFileIds] of fileDeps) {
    const fromNode = fileNodes.find((f) => f.id === fromFileId)
    if (!fromNode) continue
    const set = new Set(toFileIds)
    fromNode.uses = [...set]
    for (const toId of set) {
      const toNode = fileNodes.find((f) => f.id === toId)
      if (!toNode) continue
      toNode.usedBy = [...(toNode.usedBy ?? []), fromFileId]
    }
  }

  for (const file of fileNodes) {
    for (const sym of file.children ?? []) {
      sym.uses = (file.uses ?? []).slice(0, 8)
    }
  }

  return { symbolCount, idToPath }
}
