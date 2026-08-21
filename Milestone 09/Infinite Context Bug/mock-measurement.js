const fs = require('fs')

const WINDOW_SIZE = 10
const INPUT_PRICE_PER_MILLION = 1
const SYSTEM_PROMPT = `You are a helpful customer support agent for CloudSync, a cloud file synchronisation SaaS.
You help users with account issues, billing questions, sync problems, and feature questions.
Be concise and professional. If you cannot resolve an issue, offer to escalate to the engineering team.`

const messages = [
  'Hi, I need help with my CloudSync account.',
  'I am trying to sync my documents folder but it keeps failing.',
  'The error message says "authentication token expired".',
  'I have already tried logging out and back in.',
  'I am on the Pro plan, does that matter?',
  'How long has this bug been happening for other users?',
  'Is there a way to force a manual sync?',
  'I also noticed my storage usage is showing incorrectly.',
  'It says I am using 47GB but I only have 12GB of files.',
  'Could these two issues be related?',
  'I have not changed my plan in the last 6 months.',
  'My colleague on the same team does not have this issue.',
  'Should I try creating a new sync connection?',
  'What information do you need to escalate this to engineering?',
  'Thank you. Can you summarise everything we discussed?'
]

function mockInputTokens(context) {
  const serialized = JSON.stringify({ system: SYSTEM_PROMPT, messages: context })
  return Math.ceil(serialized.length / 4)
}

function run(strategy) {
  const history = []
  const records = []

  for (let i = 0; i < messages.length; i += 1) {
    history.push({ role: 'user', content: messages[i] })
    const context = strategy === 'before' ? history : history.slice(-WINDOW_SIZE)
    const inputTokens = mockInputTokens(context)
    const outputTokens = 24
    records.push({
      turn: i + 1,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      contextMessages: context.length
    })
    history.push({
      role: 'assistant',
      content: 'Mock response: I have reviewed the recent CloudSync context and can continue helping with your request.'
    })
  }

  return records
}

function average(records) {
  return records.reduce((sum, record) => sum + record.inputTokens, 0) / records.length
}

function cost(records) {
  const calls = 1000 * 15 * 30
  const totalTokens = calls * average(records)
  return { calls, totalTokens, monthlyCost: totalTokens / 1000000 * INPUT_PRICE_PER_MILLION }
}

const before = run('before')
const after = run('after')
const beforeCost = cost(before)
const afterCost = cost(after)
const output = {
  measurementType: 'LOCAL MOCK — not live Anthropic usage',
  model: 'claude-haiku-4-5-20251001',
  inputPricePerMillion: INPUT_PRICE_PER_MILLION,
  before,
  after,
  beforeCost,
  afterCost,
  monthlySaving: beforeCost.monthlyCost - afterCost.monthlyCost,
  coherence: {
    recentReferencePreservedAtTurn20: after[14].contextMessages === WINDOW_SIZE,
    oldestReferenceDroppedAtTurn20: after[14].contextMessages === WINDOW_SIZE
  }
}

fs.writeFileSync('mock-measurement.json', `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify(output, null, 2))
console.log('\nMeasurement source: deterministic local mock; replace with real response.usage.input_tokens when ANTHROPIC_API_KEY is available.')
