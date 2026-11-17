import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Matches Frontend `Brand.jsx` + `@theme` tokens. */
export const BRAND = {
  productName: 'deepe',
  tagline: 'Preflight AI for backends and client portals',
  primary: '#3B74E7',
  primaryDark: '#2D62C9',
  ink: '#1A2332',
  muted: '#5C6678',
  subtle: '#8A94A6',
  canvas: '#F3F5F8',
  surface: '#F7F8FA',
  border: '#E2E6EE',
}

let logoDataUri = ''

try {
  const bytes = readFileSync(path.join(__dirname, 'assets', 'deepe-icon.png'))
  logoDataUri = `data:image/png;base64,${bytes.toString('base64')}`
} catch {
  logoDataUri = ''
}

export function productNameFrom(vars = {}) {
  const raw = String(vars.productName ?? vars.fromName ?? '').trim()
  return raw || BRAND.productName
}

/** Prefer hosted logo in production; fallback to embedded icon so dev mail still renders. */
export function brandLogoSrc() {
  const explicit = String(process.env.EMAIL_BRAND_LOGO_URL ?? '').trim()
  if (explicit) return explicit
  const origin = String(process.env.APP_PUBLIC_ORIGIN ?? env.corsOrigins?.[0] ?? '').trim().replace(/\/$/, '')
  if (origin) return `${origin}/brand/deepe-icon.png`
  return logoDataUri
}

export function brandHeaderHtml(_vars = {}, esc = (value) => String(value ?? '')) {
  const product = esc(BRAND.productName)
  const logoSrc = brandLogoSrc()
  const logoCell = logoSrc
    ? `<td style="padding:0 12px 0 0;vertical-align:middle;">
        <img src="${logoSrc}" width="40" height="40" alt="${product}" style="display:block;border-radius:10px;border:1px solid rgba(255,255,255,0.35);" />
      </td>`
    : ''
  return `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      ${logoCell}
      <td style="vertical-align:middle;">
        <p style="margin:0;font-size:22px;line-height:1.2;font-weight:600;color:#ffffff;letter-spacing:-0.02em;text-transform:lowercase;">${product}</p>
        <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.85);">${esc(BRAND.tagline)}</p>
      </td>
    </tr>
  </table>`
}