import { buildPrompt } from '../utils/promptBuilder.js'

export async function callAI(userInput) {
  try {
    const response = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        messages: buildPrompt(userInput),
        temperature: 0
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || `LLM request failed with status ${response.status}`)
    const raw = data?.choices?.[0]?.message?.content
    if (typeof raw !== 'string') return { error: 'Failed to parse AI response as JSON', raw: '' }
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    try { return JSON.parse(cleaned) } catch { return { error: 'Failed to parse AI response as JSON', raw: cleaned } }
  } catch (error) {
    console.error('[AI_ERROR]', error.message)
    return { error: 'AI request failed' }
  }
}
