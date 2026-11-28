# Node backend — env checklist

Copy from `.env.example` and verify before first boot:

| Variable | Used for |
|----------|-----------|
| `DATABASE_URL` | Prisma → Postgres `public` |
| `MONGO_URI` | Code snapshots |
| `REDIS_URL` | BullMQ queues |
| `JWT_SECRET` | Portal sessions |
| `INTERNAL_API_KEY` | Calls to Python `:4100` |
| `PYTHON_BACKEND_URL` | Base URL for worker |
| `AI_WORKER_*` | Optional provider keys proxied from Node |

After edits: `docker compose up -d` and `npx prisma migrate deploy`.

*Last updated: 2026-11-28*