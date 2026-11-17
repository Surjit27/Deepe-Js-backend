export const EMAIL_PROVIDER_TYPES = [
  { id: 'sendgrid', label: 'SendGrid', description: 'Transactional email via SendGrid API (SG. keys).' },
]

/** LLM keys live in Python-backend DB (schema ai). Catalog is shared with the worker API. */
export const API_TOKEN_PROVIDER_TYPES = [
  { id: 'openai', label: 'OpenAI', freeAllowance: 'Pay-as-you-go / trial credits', bestFor: 'GPT-family models and tooling' },
  { id: 'gemini', label: 'Google AI Studio', freeAllowance: 'Free rate-limited Gemini Flash', bestFor: 'Multimodal apps and 1M-token context' },
  { id: 'anthropic', label: 'Claude (Anthropic)', freeAllowance: 'Tiered usage', bestFor: 'Long-context reasoning and agents' },
  { id: 'cursor', label: 'Cursor', freeAllowance: 'Plan-based', bestFor: 'IDE-integrated coding workflows' },
  { id: 'cerebras', label: 'Cerebras', freeAllowance: 'Up to 1M tokens/day per model', bestFor: 'High-volume daily testing and ultra-fast speed' },
  { id: 'groq', label: 'GroqCloud', freeAllowance: 'Model-specific daily limits', bestFor: 'Real-time voice and low-latency chatbots' },
  { id: 'mistral', label: 'Mistral AI', freeAllowance: 'Daily free quota / $10 monthly trial', bestFor: 'European residency and coding models' },
  { id: 'openrouter', label: 'OpenRouter', freeAllowance: '20 req/min, 50 req/day on :free models', bestFor: 'Testing many open models with one key' },
]

export const PROVIDER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
}