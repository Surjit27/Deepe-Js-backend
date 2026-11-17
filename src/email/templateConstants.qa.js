import { BRAND } from './brand.js'
import { emailLayout, escapeHtml } from './templateLayout.js'

/** QA / Settings preview + test send only — edit copy here without touching production template. */
export const QA_EMAIL_TEMPLATE_ID = 'qa'

export const QA_EMAIL_TEMPLATE = {
  id: QA_EMAIL_TEMPLATE_ID,
  label: 'QA connection test',
  description: 'Used for SendGrid preview and test send in Settings.',
  defaultSubject: 'deepe test email',
  sampleVars: {
    recipientName: 'there',
    summary: 'SendGrid is wired up for this admin workspace.',
  },
  render(vars) {
    const name = escapeHtml(vars.recipientName || 'there')
    const summary = escapeHtml(vars.summary || 'Email delivery is configured correctly.')
    const subject = String(vars.subject || this.defaultSubject)
    const bodyHtml = `<p style="margin:0 0 12px;">Hi ${name},</p>
      <p style="margin:0 0 12px;">${summary}</p>
      <p style="margin:0;">This is a <strong>QA test</strong> from ${escapeHtml(BRAND.productName)} using your verified SendGrid sender.</p>`
    const html = emailLayout({
      preheader: summary,
      title: 'Email connection test',
      bodyHtml,
      footerNote: 'QA template — if you received this, your From address and API key are working.',
      vars,
    })
    const text = `Hi ${vars.recipientName || 'there'},\n\n${vars.summary || 'Email delivery is configured correctly.'}\n\n— ${BRAND.productName}`
    return { subject, html, text }
  },
}