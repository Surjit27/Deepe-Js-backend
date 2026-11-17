import { productNameFrom } from './brand.js'
import { DEFAULT_EMAIL_TEMPLATE, DEFAULT_EMAIL_TEMPLATE_ID } from './templateConstants.js'
import { QA_EMAIL_TEMPLATE, QA_EMAIL_TEMPLATE_ID } from './templateConstants.qa.js'

export const PREVIEW_EMAIL_TEMPLATE_ID = QA_EMAIL_TEMPLATE_ID
export const TEST_EMAIL_TEMPLATE_ID = QA_EMAIL_TEMPLATE_ID

const REGISTRY = {
  [DEFAULT_EMAIL_TEMPLATE_ID]: DEFAULT_EMAIL_TEMPLATE,
  [QA_EMAIL_TEMPLATE_ID]: QA_EMAIL_TEMPLATE,
}

export function listEmailTemplates() {
  return [QA_EMAIL_TEMPLATE].map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    defaultSubject: t.defaultSubject,
    sampleVars: t.sampleVars,
  }))
}

export function renderEmailTemplate(templateId, variables = {}) {
  const key = String(templateId ?? PREVIEW_EMAIL_TEMPLATE_ID).trim() || PREVIEW_EMAIL_TEMPLATE_ID
  const template = REGISTRY[key]
  if (!template) {
    const err = new Error(`Unknown email template: ${key}`)
    err.status = 400
    throw err
  }
  const merged = {
    productName: productNameFrom(variables),
    ...variables,
  }
  const rendered = template.render(merged)
  return { templateId: key, ...rendered }
}