import fetch from 'node-fetch'

const AI_URL = 'https://openrouter.ai/api/v1/chat/completions'
const AI_TIMEOUT_MS = 15_000

const SUMMARIZE_SYSTEM_PROMPT = `You are an academic study assistant for KalviKonnect.
Analyze the provided notes and return a structured JSON response:
{
  "overview": "3-sentence summary of the main topic",
  "keyConcepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
  "examQuestions": ["question1", "question2"],
  "difficulty": "beginner|intermediate|advanced"
}
Return ONLY valid JSON. No markdown. No explanation.`

const STRUCTURE_SYSTEM_PROMPT = `You are a placement preparation expert for KalviKonnect.
Given interview rounds and questions, create a structured study plan as JSON:
{
  "studyPlan": [{"round": "string", "focusAreas": ["string"], "timeRequired": "string"}],
  "priorityTopics": ["topic1", "topic2", "topic3"],
  "timeline": "string",
  "tips": ["tip1", "tip2", "tip3"]
}
Return ONLY valid JSON.`

async function callAI({ messages, maxTokens, temperature, endpoint, userId }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kalvikonnect.app',
        'X-Title': 'KalviKonnect'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`OpenRouter returned HTTP ${response.status}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
      throw new Error('OpenRouter response did not contain message content')
    }

    try {
      return JSON.parse(content)
    } catch {
      return { overview: content, keyConcepts: [], examQuestions: [], difficulty: 'unknown' }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[AI_TIMEOUT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        endpoint,
        userId
      }))
    } else {
      console.error('[AI_ERROR]', JSON.stringify({
        timestamp: new Date().toISOString(),
        endpoint,
        userId,
        error: error.message
      }))
    }

    return {
      success: false,
      fallback: true,
      message: 'AI analysis unavailable. Please try again shortly.'
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export function summarizeNote(noteContent, userId) {
  return callAI({
    endpoint: 'summarize_note',
    userId,
    maxTokens: 600,
    temperature: 0.3,
    messages: [
      { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
      { role: 'user', content: noteContent }
    ]
  })
}

export function structurePlacement(rounds, questions, jobDescription, userId) {
  return callAI({
    endpoint: 'structure_placement',
    userId,
    maxTokens: 800,
    temperature: 0.4,
    messages: [
      { role: 'system', content: STRUCTURE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Job: ${jobDescription || 'Software Engineer'}\nRounds: ${JSON.stringify(rounds)}\nQuestions: ${JSON.stringify(questions)}`
      }
    ]
  })
}

export { AI_TIMEOUT_MS }
