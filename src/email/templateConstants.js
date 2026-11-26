import { BRAND } from './brand.js'
import { emailLayout, escapeHtml } from './templateLayout.js'

/** Production transactional template — extend when you add real product emails. */
export const DEFAULT_EMAIL_TEMPLATE_ID = 'default'

export const DEFAULT_EMAIL_TEMPLATE = {
  id: DEFAULT_EMAIL_TEMPLATE_ID,
  label: 'deepe transactional',
  description: 'Default branded message for platform emails.',
  defaultSubject: 'Message from deepe',
  sampleVars: {
    recipientName: 'there',
    headline: 'Update from your workspace',
    body: 'This is the standard deepe transactional layout.',
  },
  render(vars) {
    const name = escapeHtml(vars.recipientName || 'there')
    const headline = escapeHtml(vars.headline || 'Update from your workspace')
    const body = escapeHtml(vars.body || 'This is the standard deepe transactional layout.')
    const subject = String(vars.subject || this.defaultSubject)
    const bodyHtml = `<p style="margin:0 0 12px;">Hi ${name},</p>
      <p style="margin:0 0 12px;"><strong>${headline}</strong></p>
      <p style="margin:0;">${body}</p>`
    const html = emailLayout({
      preheader: vars.headline || headline,
      title: headline,
      bodyHtml,
      footerNote: BRAND.tagline,
      vars,
    })
    const text = `Hi ${vars.recipientName || 'there'},\n\n${vars.headline}\n${vars.body}\n\n— ${BRAND.productName}`
    return { subject, html, text }
  },
}