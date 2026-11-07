import dotenv from 'dotenv'

dotenv.config()

function required(name, value) {
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const nodeEnv = process.env.NODE_ENV ?? 'development'

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ??
    'http://home.localhost:5173,http://client.localhost:5173,http://admin.localhost:5173,http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** @deprecated use corsOrigins */
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  postgres: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.POSTGRES_HOST ?? '127.0.0.1',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: process.env.POSTGRES_USER ?? 'aazhi',
    password: process.env.POSTGRES_PASSWORD ?? 'aazhi',
    database: process.env.POSTGRES_DB ?? 'aazhi',
  },
  mongo: {
    uri: required('MONGODB_URI', process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/aazhi'),
  },
  redisUrl: process.env.REDIS_URL ?? '',
  auth: {
    jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET ?? 'dev-only-change-in-production'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    adminEmail: process.env.ADMIN_EMAIL ?? 'admin@aazhi.local',
    adminPassword: process.env.ADMIN_PASSWORD ?? 'Admin123!',
    adminName: process.env.ADMIN_NAME ?? 'Platform Admin',
  },
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
  /** Dev/fallback GitHub PAT when tenant has no stored credential (private repos). */
  github: {
    accountEmail: (process.env.GITHUB_ACCOUNT_EMAIL ?? '').trim().toLowerCase(),
    token: (process.env.GITHUB_TOKEN ?? process.env.GITHUB_PAT ?? '').trim(),
  },
}
