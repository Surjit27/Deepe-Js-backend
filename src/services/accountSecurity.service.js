import bcrypt from 'bcryptjs'
import { encryptSecret, decryptSecret } from '../lib/secretBox.js'
import {
  findUserCredentialsById,
  setTwoFactorEnabled,
  updateUserPasswordHash,
  writeTotpSecretCipher,
} from '../repositories/accountSecurity.repository.js'
import { generateTotpSecret, buildOtpAuthUrl, verifyTotpCode } from '../lib/totp.js'

const PASSWORD_MIN = 8
const PASSWORD_MAX = 200

function validateNewPassword(password) {
  const next = String(password ?? '')
  if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) {
    const err = new Error(`Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters`)
    err.status = 400
    throw err
  }
  return next
}

export async function getAccountSecuritySummary(userId) {
  const row = await findUserCredentialsById(userId)
  if (!row) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  return { twoFactorEnabled: Boolean(row.two_factor_enabled) }
}

export async function changeAccountPassword(userId, currentPassword, newPassword) {
  const row = await findUserCredentialsById(userId)
  if (!row) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  const ok = await bcrypt.compare(String(currentPassword ?? ''), row.password_hash)
  if (!ok) {
    const err = new Error('Current password is incorrect')
    err.status = 401
    throw err
  }
  const next = validateNewPassword(newPassword)
  const same = await bcrypt.compare(next, row.password_hash)
  if (same) {
    const err = new Error('New password must be different from the current password')
    err.status = 400
    throw err
  }
  const passwordHash = await bcrypt.hash(next, 12)
  await updateUserPasswordHash(userId, passwordHash)
  return { ok: true }
}

export async function beginTwoFactorSetup(userId, email) {
  const row = await findUserCredentialsById(userId)
  if (!row) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  if (row.two_factor_enabled) {
    const err = new Error('Two-factor authentication is already enabled')
    err.status = 409
    throw err
  }
  const secret = generateTotpSecret()
  await writeTotpSecretCipher(userId, encryptSecret(secret))
  return {
    secret,
    otpauthUrl: buildOtpAuthUrl({ email, secret }),
  }
}

export async function confirmTwoFactorSetup(userId, code) {
  const row = await findUserCredentialsById(userId)
  if (!row) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  if (row.two_factor_enabled) {
    const err = new Error('Two-factor authentication is already enabled')
    err.status = 409
    throw err
  }
  const secret = decryptSecret(row.totp_secret_cipher)
  if (!secret || !verifyTotpCode(secret, code)) {
    const err = new Error('Invalid authentication code')
    err.status = 401
    throw err
  }
  await setTwoFactorEnabled(userId, true)
  return { twoFactorEnabled: true }
}

export async function disableTwoFactor(userId, { password, code }) {
  const row = await findUserCredentialsById(userId)
  if (!row) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  if (!row.two_factor_enabled) {
    const err = new Error('Two-factor authentication is not enabled')
    err.status = 400
    throw err
  }
  const ok = await bcrypt.compare(String(password ?? ''), row.password_hash)
  if (!ok) {
    const err = new Error('Current password is incorrect')
    err.status = 401
    throw err
  }
  const secret = decryptSecret(row.totp_secret_cipher)
  if (!secret || !verifyTotpCode(secret, code)) {
    const err = new Error('Invalid authentication code')
    err.status = 401
    throw err
  }
  await setTwoFactorEnabled(userId, false)
  return { twoFactorEnabled: false }
}

export async function verifyTwoFactorForUser(userId, code) {
  const row = await findUserCredentialsById(userId)
  if (!row?.two_factor_enabled) {
    const err = new Error('Two-factor authentication is not enabled for this account')
    err.status = 400
    throw err
  }
  const secret = decryptSecret(row.totp_secret_cipher)
  if (!secret || !verifyTotpCode(secret, code)) {
    const err = new Error('Invalid authentication code')
    err.status = 401
    throw err
  }
  return true
}