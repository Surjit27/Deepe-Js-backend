# Deepe (Aazhi) — project & scope

**Deepe** is a multi-portal product for understanding and operating connected software backends: Git-linked **repo indexing**, **code / import graphs**, **workflow and job tooling**, and (via a Python worker) **LLM-assisted decode**. The public name is **Deepe**; GitHub repositories use the **Aazhi** naming prefix.

This document describes the **whole system** and the **scope of this repository** (the Node / Express API).

## Three repositories (no parent git repo)

The product is split across three independent repos. On disk they often live as siblings under a local folder (for example `Personal projects/Aazhi/`); there is **no** umbrella git repository—clone and version each repo separately.

| Repository | GitHub | Runtime | Default port |
|------------|--------|---------|--------------|
| **Frontend** | [Surjit27/Aazhi](https://github.com/Surjit27/Aazhi) | React 18 + Vite | 5173 |
| **Node backend** (this repo) | [Surjit27/Aazhi-js-backend](https://github.com/Surjit27/Aazhi-js-backend) | Express + Prisma | 4000 |
| **Python backend** | [Surjit27/Deepe-agent-backend](https://github.com/Surjit27/Deepe-agent-backend) | FastAPI (internal) | 4100 |

Related docs in the other repos:

- Frontend: `Frontend/docs/PROJECT_AND_SCOPE.md`
- Python: `Python-backend/docs/PROJECT_AND_SCOPE.md`, `Python-backend/docs/SCHEMA_ARCHITECTURE.md`

## System architecture (high level)

```text
                    ┌─────────────────────────────────────┐
                    │  Browsers (hostname-based portals)   │
                    │  home · client · admin @ :5173      │
                    └──────────────────┬──────────────────┘
                                       │ HTTPS / JSON + JWT
                                       ▼
                    ┌─────────────────────────────────────┐
                    │  Node API (this repo)               │
                    │  Auth, portal data, job orchestration │
                    │  Postgres public · Mongo · Redis    │
                    └──────────┬─────────────┬────────────┘
                               │ BullMQ      │ Internal HTTP
                               ▼             ▼
                    ┌──────────────┐  ┌─────────────────────┐
                    │ Redis        │  │ Python-backend      │
                    │ job queues   │  │ Index / graph / LLM │
                    └──────────────┘  │ Postgres ai schema  │
                                      │ Mongo ai_* docs     │
                                      └─────────────────────┘
```

**Source of truth for the client UI** lives here: **`public`** PostgreSQL (Prisma), plus Mongo for document data Node already owns. Python writes **`ai.*`** and returns snapshots; Node merges graph results into portal tables and drives UI status (`index_run`, explorer APIs).

## This repo: Node backend — responsibilities

### In scope

- **JWT auth** and **portal surface** rules (`X-App-Surface`: `home` | `client` | `admin`).
- **Prisma** models and migrations for **`public`** (users, roles, email settings, job triggers, audit, feature flags, repo index / explorer APIs as implemented).
- **Per-client business data** via `src/db/clientSchema/migrations/` (`client_<uuid>` schemas), not one physical table set per tenant in Prisma.
- **MongoDB** for existing app/document storage (non-login).
- **BullMQ** on **Redis**: job triggers, **repo index** runner (`repoIndexRunner.js`), worker in API process when `REDIS_URL` is set.
- **GitHub** integration services for connected repos and index jobs.
- **SendGrid** email settings (encrypted API key in Postgres).
- HTTP orchestration to Python: create `backend` / `index_run` rows, enqueue work, accept `GraphSnapshot` JSON (merge to `public` — ongoing).
- Docker Compose: API, Postgres (:5433), Mongo, Redis.

### Out of scope (belongs in other repos)

- React routes, hostname portal UX → **Frontend**.
- Git clone, static analysis binaries, LLM provider calls, Alembic on **`ai`** schema → **Python backend**.
- Browser asset build and CORS policy consumers (Frontend configures origins; this API sets `CORS_ORIGIN`).

### Data ownership rules

| Store | Owner | Notes |
|-------|--------|------|
| Postgres `public` | Node / Prisma | Portal source of truth |
| Postgres `ai` | Python / Alembic | Never migrate from Prisma |
| Postgres `client_*` | Node SQL migrations | Tenant business tables |
| Mongo `ai_*` prefix | Python | RAG snippets, repo snapshots |
| Mongo (other) | Node | Unchanged app docs |

See Python `docs/SCHEMA_ARCHITECTURE.md` for sequence diagrams and field identity (`clientUserId`, `backendId`, `indexRunId`).

### Local dev (this repo)

Primary path: **Docker** — see [README.md](../README.md).

Optional Node-on-host dev: Node 20+, `npm run docker:db`, Redis up, `npm run dev` on port 4000.

## Product scope (cross-cutting)

### Currently implemented / active themes

- Multi-portal auth and admin/client route APIs.
- **Explorer** and **repo index** services (`clientExplorer.routes.js`, `repoIndex.service.js`, etc.).
- Job triggers, history APIs, email settings.
- Internal job dispatch toward Python where configured (`INTERNAL_API_KEY`, worker URL).

### Planned / in progress

- Full **UPSERT** of graph entities into `public` after Python index success.
- Client **projects** persistence replacing Frontend localStorage where migrations land.
- Encrypted **LLM key** settings in `public` with short-lived keys passed into Python jobs.

### Explicit non-goals (for now)

- Prisma multi-schema including `ai`.
- Python as the user-facing API.
- Second Postgres database for AI workloads (schema split first).

## How to work across repos

1. New **index/decode** fields → update Python `app/contracts/`, Node job client, then Frontend consumers.
2. New **portal entity** → Prisma migration here; expose route; then Frontend page/service.
3. Contract versioning → treat Python OpenAPI + `app/contracts/` as the HTTP truth for worker payloads.

## Documentation map

| Document | Where |
|----------|--------|
| **Project & scope** (this file) | `docs/PROJECT_AND_SCOPE.md` in each of the three repos |
| **Postgres / Mongo split, job handoff** | `Python-backend/docs/SCHEMA_ARCHITECTURE.md` |
| **Runbooks** | Each repo’s `README.md` |
| **Local dev issues** | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| **Env checklist** | [ENV_CHECKLIST.md](./ENV_CHECKLIST.md) |

When system scope changes, update the matching sections in **all three** `PROJECT_AND_SCOPE.md` copies and bump the *Last updated* line below.

## Local Git identity (Aazhi clones only)

The three repos are often siblings under one folder (for example `Personal projects/Aazhi/`). Use **repo-local** Git config in each clone so other folders on the machine keep their own `user.name` / `user.email`:

```bash
cd backend   # repeat in Frontend/ and Python-backend/
git config user.name "Surjit27"
git config user.email "128356922+Surjit27@users.noreply.github.com"
```

This does **not** modify global Git configuration.

---

*Last updated: 2026-11-28 — keep in sync with sibling copies in `Frontend/docs/` and `Python-backend/docs/` when system scope changes.*