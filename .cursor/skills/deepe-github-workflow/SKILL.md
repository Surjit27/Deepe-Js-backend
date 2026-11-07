---
name: deepe-github-workflow
description: >-
  Deepe monorepo GitHub policy: three repos (Deepe, Deepe-Js-backend,
  Deepe-agent-backend), branch protection, PR + issue pairing. Use when opening
  PRs, pushing code, configuring GitHub, or working across frontend, Node API,
  or Python AI worker repos.
---

# Deepe GitHub workflow

**This copy lives in each Deepe repo** (`.cursor/skills/deepe-github-workflow/`). Keep in sync when policy changes.

## Repositories

| Repo | Purpose | Default integration branch |
|------|---------|----------------------------|
| [Surjit27/Deepe](https://github.com/Surjit27/Deepe) | Client/admin frontend (Vite/React) | `develop` (release via `main`) |
| [Surjit27/Deepe-Js-backend](https://github.com/Surjit27/Deepe-Js-backend) | Node API, Prisma, tenant schemas | `develop` |
| [Surjit27/Deepe-agent-backend](https://github.com/Surjit27/Deepe-agent-backend) | Python FastAPI AI worker (`ai` schema) | `main` |

Local paths (typical): `Frontend/`, `backend/`, `Python-backend/` under the Aazhi/Deepe workspace.

## Branch protection (configured)

On all three repos:

- **`main`**: no direct pushes or merges; changes only through a **pull request** with **≥ 1 approving review**; conversation resolution required; admins included (`enforce_admins`).
- **`develop`** (Deepe + Deepe-Js-backend only): same rules as `main`.

Repository ruleset: **Require PR and 1 approval** (deletion and non-fast-forward blocked).

Agents must **not** push to `main` or `develop`; use feature branches and open PRs.

## When you open a PR

Do this **every time**, in order:

1. **Branch** off the correct base (`develop` for Deepe + Deepe-Js-backend unless user says otherwise; `main` for Deepe-agent-backend).
2. **Commit and push** the feature branch; open PR with summary + test plan.
3. **Create a GitHub issue** in the **same repo** as the PR (or Deepe for cross-cutting frontend+backend work, with links to both PRs).
   - Title: short feature/fix name.
   - Body must include:
     - **`Repo:`** `Deepe` | `Deepe-Js-backend` | `Deepe-agent-backend`
     - **PR link(s)** (all related repos if multi-repo change)
     - Summary + test plan checklist
   - Labels when available: `enhancement` or `bug`, `area: frontend` / backend area, `status: in progress` until merged; then close with comment linking the merged PR.
4. **Cross-link**: comment on the PR with `Fixes #N` or `Relates to #N`; comment on the issue with the PR URL.

Multi-repo features: one issue per repo **or** one Deepe epic issue listing each repo and PR—prefer one issue per repo for clarity.

## Merge expectations

- Wait for **one approval** (human or designated reviewer); do not merge via direct push.
- If protection blocks merge, fix reviews or CI; do not bypass rulesets.

## gh examples

```bash
# Issue with repo callout (Deepe frontend)
gh issue create --repo Surjit27/Deepe \
  -t "Short title" \
  -l enhancement -l "status: in progress" -l "area: frontend" \
  -b "$(cat <<'EOF'
Repo: Deepe

## PR
- 

## Summary
-

## Test plan
- [ ]
EOF
)"

# Node backend PR base develop
gh pr create --repo Surjit27/Deepe-Js-backend --base develop --head feat/my-branch \
  --title "..." --body "..."
```

## Related user rules

Follow the user's `creating-pull-requests` rule for git status/diff/log before PR creation. This skill adds **mandatory issue creation** and **repo naming** on top.
