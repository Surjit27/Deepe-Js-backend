import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_SECONDS = 30
const ISSUER = 'Aazhi'

function base32Encode(buffer) {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

function base32Decode(encoded) {
  const normalized = String(encoded).replace(/=+$/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes = []
  for (const char of normalized) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20))
}

export function buildOtpAuthUrl({ email, secret }) {
  const label = encodeURIComponent(`${ISSUER}:${email}`)
  const params = new URLSearchParams({
    secret,
    issuer: ISSUER,
    algorithm: 'SHA1',
    digits: '6',
    period: String(STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

function hotp(secret, counter) {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', key).update(buf).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return String(code).padStart(6, '0')
}

function totpAt(secret, unixSeconds) {
  const counter = Math.floor(unixSeconds / STEP_SECONDS)
  return hotp(secret, counter)
}

export function verifyTotpCode(secret, token, { window = 1 } = {}) {
  const normalized = String(token ?? '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(normalized)) return false
  const now = Math.floor(Date.now() / 1000)
  for (let drift = -window; drift <= window; drift += 1) {
    const expected = totpAt(secret, now + drift * STEP_SECONDS)
    try {
      if (timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))) return true
    } catch {
      /* length mismatch */
    }
  }
  return false
}