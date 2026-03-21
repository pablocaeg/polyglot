/**
 * DeepSeek API client — centralizes all LLM API access.
 */

const API_URL = 'https://api.deepseek.com/chat/completions'

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY not configured')
  return key
}

/** Non-streaming JSON request to DeepSeek */
export async function callDeepSeek(opts: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      temperature: opts.temperature ?? 0.7,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.jsonMode !== false ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw Object.assign(new Error(errText), { status: res.status })
  }

  const data: any = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from DeepSeek')
  return content
}

/** Streaming request to DeepSeek — returns the raw Response for SSE piping */
export async function streamDeepSeek(opts: {
  systemPrompt: string
  messages: Array<{ role: string; content: string }>
  temperature?: number
  maxTokens?: number
}): Promise<Response> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: opts.systemPrompt }, ...opts.messages],
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 300,
      stream: true,
    }),
  })

  return res
}
