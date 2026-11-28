# Node backend troubleshooting

Quick fixes for local Deepe API development.

## `docker compose` / Postgres not reachable

1. From this repo root: `docker compose up -d postgres mongo redis`.
2. Default mapped Postgres port is often **5433** on the host—match `DATABASE_URL` in `.env`.
3. After first boot: `npx prisma migrate deploy` (or project README flow).

## BullMQ jobs never run

1. Confirm **`REDIS_URL`** is set and Redis container is healthy.
2. API process must start the worker when Redis is configured—check startup logs for queue registration.
3. Without Redis, some features degrade to synchronous stubs; index jobs still need Redis + Python URL.

## Python index calls fail (401 / connection refused)

1. Run **Python-backend** on **4100** (`uvicorn app.main:app --reload --port 4100`).
2. Set **`INTERNAL_API_KEY`** to the same value in Node and Python `.env`.
3. Node should call the internal base URL from env (see `README.md`).

## JWT expired / sudden 401 on all routes

1. Log out and log in again—the client stores the token in `localStorage`.
2. Confirm server `JWT_SECRET` did not change between restarts (invalidates old tokens).
3. Admin vs client surfaces use the same API host; wrong `X-App-Surface` can look like auth failure on some routes.

## Email provider tests fail in admin

1. Apply latest Prisma migrations (`npx prisma migrate deploy`).
2. Store provider secrets via admin UI; masked values are not re-sent to the browser.
3. Check `docker compose logs api` for SendGrid/SMTP transport errors.

## Prisma vs `ai` schema

Never run Prisma migrations against schema **`ai`**—that schema is owned by Python Alembic. If you see cross-schema errors, review `Python-backend/docs/SCHEMA_ARCHITECTURE.md`.

## Related docs

- [PROJECT_AND_SCOPE.md](./PROJECT_AND_SCOPE.md)
- [../README.md](../README.md) — Docker-first runbook

*Last updated: 2026-11-28*