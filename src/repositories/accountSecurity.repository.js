import { getPostgresPool } from '../db/postgres.js'

export async function findUserCredentialsById(userId) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, email, password_hash, two_factor_enabled, totp_secret_cipher
     FROM users
     WHERE id = $1`,
    [userId],
  )
  return rows[0] ?? null
}

export async function findUserCredentialsByEmail(email) {
  const { rows } = await getPostgresPool().query(
    `SELECT id, email, password_hash, role, access_role_key, tenant_owner_id, display_name, created_at,
            two_factor_enabled, totp_secret_cipher,
            COALESCE((SELECT portal FROM roles WHERE key = u.role), CASE WHEN u.role = 'admin' THEN 'admin' ELSE 'client' END) AS portal
     FROM users u
     WHERE u.email = $1`,
    [email.toLowerCase()],
  )
  return rows[0] ?? null
}

export async function updateUserPasswordHash(userId, passwordHash) {
  await getPostgresPool().query(
    `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
    [userId, passwordHash],
  )
}

export async function writeTotpSecretCipher(userId, cipher) {
  await getPostgresPool().query(
    `UPDATE users SET totp_secret_cipher = $2, updated_at = NOW() WHERE id = $1`,
    [userId, cipher],
  )
}

export async function setTwoFactorEnabled(userId, enabled) {
  await getPostgresPool().query(
    `UPDATE users
     SET two_factor_enabled = $2,
         totp_secret_cipher = CASE WHEN $2 = false THEN '' ELSE totp_secret_cipher END,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, enabled],
  )
}