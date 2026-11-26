import { BRAND, brandHeaderHtml, productNameFrom } from './brand.js'

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function emailLayout({ preheader, title, bodyHtml, cta, footerNote, vars }) {
  const product = escapeHtml(productNameFrom(vars))
  const preheaderText = escapeHtml(preheader)
  const header = brandHeaderHtml(vars, escapeHtml)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:Inter,Segoe UI,Arial,sans-serif;">
  <div style="display:none!important;max-height:0;overflow:hidden;mso-hide:all;">${preheaderText}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(22,35,58,0.05);">
          <tr>
            <td style="padding:22px 24px;background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 100%);">
              ${header}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <h2 style="margin:0 0 12px;font-size:17px;line-height:1.4;color:${BRAND.ink};">${escapeHtml(title)}</h2>
              <div style="font-size:14px;line-height:1.65;color:${BRAND.muted};">${bodyHtml}</div>
              ${
                cta
                  ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(cta.href)}" style="display:inline-block;padding:10px 18px;background:${BRAND.primary};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(cta.label)}</a></p>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 22px;border-top:1px solid ${BRAND.border};background:${BRAND.surface};">
              <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(footerNote || BRAND.tagline)}</p>
              <p style="margin:10px 0 0;font-size:11px;color:${BRAND.subtle};">
                <span style="font-weight:600;color:${BRAND.ink};text-transform:lowercase;">${BRAND.productName}</span>
                · Sent via SendGrid · ${product}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}