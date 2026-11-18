import { getPostgresPool } from '../db/postgres.js'

export async function readPersonalSettings(userId) {
  const { rows } = await getPostgresPool().query(
    `SELECT personal_settings FROM users WHERE id = $1`,
    [userId],
  )
  return rows[0]?.personal_settings ?? {}
}

export async function writePersonalSettings(userId, settings) {
  const { rows } = await getPostgresPool().query(
    `UPDATE users
     SET personal_settings = $2::jsonb, updated_at = NOW()
     WHERE id = $1
     RETURNING personal_settings`,
    [userId, JSON.stringify(settings)],
  )
  return rows[0]?.personal_settings ?? {}
}