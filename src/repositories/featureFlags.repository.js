import { getPostgresPool } from '../db/postgres.js'

export async function listFeatureFlags() {
  const { rows } = await getPostgresPool().query(
    `SELECT key, label, description, nav_path, default_enabled, sort_order, created_at, updated_at
     FROM feature_flags
     ORDER BY sort_order, key`,
  )
  return rows
}

export async function insertFeatureFlag({ key, label, description, navPath, defaultEnabled, sortOrder }) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO feature_flags (key, label, description, nav_path, default_enabled, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING key, label, description, nav_path, default_enabled, sort_order, created_at, updated_at`,
    [key, label, description ?? '', navPath ?? '', defaultEnabled ?? true, sortOrder ?? 0],
  )
  return rows[0]
}

export async function updateFeatureFlag(key, { label, description, navPath, defaultEnabled, sortOrder }) {
  const { rows } = await getPostgresPool().query(
    `UPDATE feature_flags SET
       label = COALESCE($2, label),
       description = COALESCE($3, description),
       nav_path = COALESCE($4, nav_path),
       default_enabled = COALESCE($5, default_enabled),
       sort_order = COALESCE($6, sort_order),
       updated_at = NOW()
     WHERE key = $1
     RETURNING key, label, description, nav_path, default_enabled, sort_order, created_at, updated_at`,
    [key, label ?? null, description ?? null, navPath ?? null, defaultEnabled ?? null, sortOrder ?? null],
  )
  return rows[0] ?? null
}

export async function listOverridesForClient(clientUserId) {
  const { rows } = await getPostgresPool().query(
    `SELECT flag_key, enabled, updated_at FROM client_feature_flag_overrides WHERE client_user_id = $1`,
    [clientUserId],
  )
  return rows
}

export async function upsertClientOverride(clientUserId, flagKey, enabled) {
  const { rows } = await getPostgresPool().query(
    `INSERT INTO client_feature_flag_overrides (client_user_id, flag_key, enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (client_user_id, flag_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()
     RETURNING client_user_id, flag_key, enabled, updated_at`,
    [clientUserId, flagKey, enabled],
  )
  return rows[0]
}

export async function deleteClientOverride(clientUserId, flagKey) {
  await getPostgresPool().query(`DELETE FROM client_feature_flag_overrides WHERE client_user_id = $1 AND flag_key = $2`, [
    clientUserId,
    flagKey,
  ])
}