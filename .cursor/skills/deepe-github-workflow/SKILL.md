---
name: deepe-github-workflow
description: >-
  Deepe monorepo GitHub policy: three repos (Aazhi/Deepe, Deepe-Js-backend,
  Deepe-agent-backend), PR + issue pairing. Use when opening PRs, pushing code,
  configuring GitHub, or working across frontend, Node API, or Python AI worker
  repos.
---

# Deepe GitHub workflow

**This copy lives in each Deepe repo** (`.cursor/skills/deepe-github-workflow/`). Keep in sync when policy changes.

## Repositories

| Repo | Purpose | Default integration branch |
|------|---------|----------------------------|
| [Surjit27/Aazhi](https://github.com/Surjit27/Aazhi) | Client/admin frontend (Vite/React) | `main` |
| [Surjit27/Deepe-Js-backend](https://github.com/Surjit27/Deepe-Js-backend) | Node API, Prisma, tenant schemas | `main` |
| [Surjit27/Deepe-agent-backend](https://github.com/Surjit27/Deepe-agent-backend) | Python FastAPI AI worker (`ai` schema) | `main` |

Local paths (typical): `Frontend/`, `backend/`, `Python-backend/` under the Aazhi/Deepe workspace.

## Branch protection (current policy)

**Approving reviews are not required** for now. Owner (**Surjit27**) may:

- Push to **`main`** when the user asks (e.g. docs, small fixes), or
- Merge PRs with **`gh pr merge`** without a separate approver account.

Optional rulesets on GitHub may exist but are **disabled** or minimal—do not block on “wait for approval.”

For larger features, still prefer **feature branch → PR → merge** for history and review, but **no mandatory second-account approval** (no billionfolds-code step).

## When you open a PR

Do this **every time**, in order:

1. **Branch** off **`main`** unless the user specifies another base.
2. **Commit and push** the feature branch; open PR with summary + test plan.
3. **Create a GitHub issue** in the **same repo** as the PR (or Aazhi for cross-cutting frontend+backend work, with links to both PRs).
   - Title: short feature/fix name.
   - Body must include:
     - **`Repo:`** `Aazhi` | `Deepe-Js-backend` | `Deepe-agent-backend`
     - **PR link(s)** (all related repos if multi-repo change)
     - Summary + test plan checklist
   - Labels when available: `enhancement` or `bug`, area labels, `status: in progress` until merged; then close with comment linking the merged PR.
4. **Cross-link**: comment on the PR with `Fixes #N` or `Relates to #N`; comment on the issue with the PR URL.

Multi-repo features: one issue per repo **or** one epic issue listing each repo and PR—prefer one issue per repo for clarity.

## Merge expectations

- Merge when **CI is green** (if configured) and the user wants the change landed.
- **No required approving review**; use `gh pr merge` as Surjit27.
- Resolve conflicts on the PR branch before merge.

## gh examples

```bash
# Issue with repo callout (frontend)
gh issue create --repo Surjit27/Aazhi \
  -t "Short title" \
  -l enhancement -l "status: in progress" -l "area: frontend" \
  -b "$(cat <<'EOF'
Repo: Aazhi

## PR
-

## Summary
-

## Test plan
- [ ]
EOF
)"

# Merge without approval workflow
gh pr merge <NUMBER> --repo Surjit27/Deepe-Js-backend --merge
```

## Related user rules

Follow the user's `creating-pull-requests` rule for git status/diff/log before PR creation. This skill adds **issue creation** and **repo naming** on top.