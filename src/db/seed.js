import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { getPostgresPool } from './postgres.js'

export async function seedAdminUser() {
  const pool = getPostgresPool()
  const email = env.auth.adminEmail.toLowerCase().trim()
  const passwordHash = await bcrypt.hash(env.auth.adminPassword, 12)

  if (env.isProd) {
    const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [email])
    if (rows.length > 0) return
    await pool.query(
      `INSERT INTO users (email, password_hash, role, display_name)
       VALUES ($1, $2, 'admin', $3)`,
      [email, passwordHash, env.auth.adminName],
    )
    console.log(`[seed] admin user created: ${email}`)
    return
  }

  await pool.query(
    `INSERT INTO users (email, password_hash, role, display_name)
     VALUES ($1, $2, 'admin', $3)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       display_name = EXCLUDED.display_name,
       role = 'admin',
       updated_at = NOW()`,
    [email, passwordHash, env.auth.adminName],
  )
  console.log(`[seed] admin ready: ${email} (dev password synced from ADMIN_PASSWORD)`)
}

export async function seedClientAccessRoles() {
  const pool = getPostgresPool()
  await pool.query(
    `INSERT INTO roles (key, label, portal) VALUES
      ('super_admin', 'Super admin', 'client'),
      ('member', 'Member', 'client')
     ON CONFLICT (key) DO NOTHING`,
  )
}
