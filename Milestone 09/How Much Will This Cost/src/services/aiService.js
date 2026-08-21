const SYSTEM_PROMPT = `You are an academic study assistant. Analyze the provided notes and return a structured JSON response with exactly these three fields:
- overview: A 3-sentence summary of the main topic
- keyConcepts: An array of exactly 5 key concepts as strings
- examQuestions: An array of exactly 2 likely exam questions as strings

Return ONLY valid JSON. No markdown. No explanation. Just the JSON object.`

function createMockResponse(noteContent) {
  const words = noteContent.trim().split(/\s+/).filter(Boolean).length
  const promptTokens = 95 + Math.ceil(words * 1.28)
  const completionTokens = 178 + (words % 17)

  return {
    async json() {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              overview: `This mock summary covers the main ideas in a ${words}-word academic note. It is generated locally so the endpoint can be tested without an external API key. The token usage values are deterministic and suitable for practicing cost estimation.`,
              keyConcepts: ['main topic', 'core definition', 'supporting evidence', 'cause and effect', 'practical application'],
              examQuestions: ['What are the central concepts described in the note?', 'How could the evidence in the note be applied to an exam problem?']
            })
          }
        }],
        usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
      }
    }
  }
}

export async function summarizeNote(noteContent, userId) {
  let response

  if (process.env.MOCK_AI === 'true') {
    response = createMockResponse(noteContent)
  } else {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://noteai.app',
        'X-Title': 'NoteAI'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: noteContent }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    })
  }

  const data = await response.json()

  const usage = data.usage
  if (usage) {
    console.log('[AI_USAGE]', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId,
      model: 'openai/gpt-4o-mini',
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      endpoint: 'summarize_note'
    }))
  }

  if (!data.choices || !data.choices[0]) {
    throw new Error(`Invalid LLM response: ${JSON.stringify(data)}`)
  }

  const content = data.choices[0].message.content

  try {
    return JSON.parse(content)
  } catch {
    return { overview: content, keyConcepts: [], examQuestions: [] }
  }
}
