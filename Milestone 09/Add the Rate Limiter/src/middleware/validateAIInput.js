const INJECTION_PATTERNS = [
  'ignore your instructions',
  'ignore previous',
  'disregard the above',
  'you are now',
  'act as if',
  'forget your previous',
  'new instructions:'
]

export function validateNoteSummarize(req, res, next) {
  const { noteContent } = req.body

  if (typeof noteContent !== 'string' || noteContent.trim() === '') {
    return res.status(400).json({
      error: 'input_required',
      message: 'Note content is required to generate a summary.'
    })
  }

  if (noteContent.length > 8000) {
    req.body.noteContent = noteContent.slice(0, 8000)
    req.body.truncated = true
  }

  const inputLower = noteContent.toLowerCase()
  const matchedPattern = INJECTION_PATTERNS.find((pattern) => inputLower.includes(pattern))

  if (matchedPattern) {
    console.warn('[INJECTION_ATTEMPT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      pattern: matchedPattern,
      inputSnippet: noteContent.slice(0, 150)
    }))

    return res.status(400).json({
      error: 'invalid_input',
      message: 'Input contains unsupported content.'
    })
  }

  next()
}

export function validatePlacementStructure(req, res, next) {
  const { rounds, questions } = req.body

  if (rounds === undefined || rounds === null || questions === undefined || questions === null) {
    return res.status(400).json({
      error: 'missing_fields',
      message: 'Placement structuring requires both rounds and questions fields.'
    })
  }

  if (!Array.isArray(rounds) || !Array.isArray(questions)) {
    return res.status(400).json({
      error: 'invalid_format',
      message: 'rounds and questions must be arrays.'
    })
  }

  next()
}
