# Aazhi Backend

Express API — PostgreSQL + MongoDB. **Runs in Docker** (API + both databases).

## Requirements

- [Docker](https://docs.docker.com/get-docker/) + Compose v2

## Start (Docker only)

```bash
cd backend
docker compose up --build
```

Detached:

```bash
npm run docker:up:detached
# or: docker compose up --build -d
```

| URL | Purpose |
|-----|---------|
| http://localhost:4000/api/health | Health + DB status |
| http://localhost:4000/api/ready | Readiness |

Stop: `docker compose down` · wipe DB volumes: `docker compose down -v`

### Docker “permission denied” on `docker.sock`

After `sudo usermod -aG docker $USER`, you must **log out and back in** (or reboot).

Until then, either:

```bash
newgrp docker          # new shell with docker group in this terminal only
docker compose up -d postgres mongo
```

or run once with sudo:

```bash
sudo docker compose up -d postgres mongo
```

Check DB ports: `ss -tln | grep -E '5433|27017'`

`CORS_ORIGIN` defaults to `http://localhost:5173` for a frontend running on the host.

## Optional: local Node dev

Requires **Node 20+** (default shell may be Node 16 — use nvm):

```bash
nvm install 20
nvm use 20          # or: nvm use   (reads .nvmrc)
node -v             # must show v20.x

cp .env.example .env
npm install         # also runs prisma generate
npm run docker:db   # Postgres :5433 + Mongo :27017 (avoids local Postgres on 5432)
docker compose up -d redis   # BullMQ on :6379
npm run dev         # http://localhost:4000  (starts the BullMQ worker when REDIS_URL is set)
```

Hot reload (Node 20+ only): `npm run dev:watch`

## Auth (PostgreSQL + JWT)

User accounts live in **PostgreSQL** (`users` table: `admin` | `client` roles). **MongoDB** stays for app/document data — not for login.

**Two portals (same idea as Ad-portal, role-only):**

| Surface | Frontend host | `X-App-Surface` | Who can log in |
|---------|---------------|-----------------|----------------|
| Home (public) | `home.localhost` | `home` | Client **sign-in / sign-up** only (`POST /api/auth/signup` requires `X-App-Surface: home`) |
| Client | `client.localhost` | `client` | `client` users only |
| Admin | `admin.localhost` | `admin` | `admin` users only |

Dev: `npm run dev` in `Frontend/`, then open **http://home.localhost:5173**, **http://client.localhost:5173**, or **http://admin.localhost:5173**. Plain **http://localhost:5173** redirects to `client.localhost`.

Login rejects wrong role for the portal. Authenticated routes also require `req.auth.role` to match `X-App-Surface`. Admin user APIs require admin portal + admin role.

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/auth/login` | Public `{ email, password }` + portal header → `{ token, user }` |
| GET | `/api/auth/me` | Bearer + matching portal |
| GET | `/api/auth/users` | Admin portal + admin role |
| POST | `/api/auth/users` | Admin portal + admin role — create `admin` or `client` |

Default admin (seeded on first start): see `.env` `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Prisma

PostgreSQL tables are described in `prisma/schema.prisma`. The client is `src/db/prisma.js`. `DATABASE_URL` must be set.

New client data is a new model in that file, with `clientId` pointing at `users.id`. Every client shares the table. Prisma does not create a separate set of tables per client.

```bash
npx prisma migrate dev --name add_client_orders
```

The API runs `prisma migrate deploy` before it listens. The first migration is a baseline of the tables that already exist. On a database that was created before Prisma, mark it applied once:

```bash
npx prisma migrate resolve --applied 20261105090000_init
```

## Email (SendGrid)

Admin Settings stores the from address and an optional API key. The key is encrypted in PostgreSQL. For local use, create a key in SendGrid and put it in `.env`:

```bash
SENDGRID_API_KEY=SG.your-key
```

Restart the API after changing `.env`. The Settings test sends one message through SendGrid. A saved key in Settings overrides `SENDGRID_API_KEY`.

## Job triggers (BullMQ)

Time, event, and dependency triggers are stored in PostgreSQL and run by a BullMQ worker in the API process. Redis must be up or the API still starts and reports the runner as off.

```bash
docker compose up -d redis
```

`REDIS_URL` defaults to `redis://127.0.0.1:6379` in `.env.example`. Run now waits until the worker finishes and records `last_status`. The worker logs the target; it does not call that URL.

Protected examples: `/api/admin/summary` (admin), `/api/client/summary` (client).

## Endpoints

| Method | Path |
|--------|------|
| GET | `/api/health` |
| GET | `/api/ready` |
| GET | `/api/orders` (stub) |

## Layout

```
Dockerfile
docker-compose.yml   # api + postgres + mongo
src/
```
