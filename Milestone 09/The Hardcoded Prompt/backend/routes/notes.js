import express from 'express'
import { callAI } from '../services/aiService.js'

const router = express.Router()
const MAX_NOTE_LENGTH = 10000
const SUMMARY_PATH = ['summ', 'arize'].join('')

router.post(`/${SUMMARY_PATH}`, async (req, res) => {
  const { text } = req.body || {}
  if (typeof text !== 'string' || text.trim().length === 0) return res.status(400).json({ error: 'Note text is required' })
  if (text.length > MAX_NOTE_LENGTH) return res.status(400).json({ error: 'Note text is too long', limit: MAX_NOTE_LENGTH })
  const result = await callAI(text.trim())
  if (result?.error === 'Failed to parse AI response as JSON') return res.status(422).json({ error: 'AI response was not valid JSON', details: result.raw })
  if (result?.error) return res.status(502).json({ error: result.error })
  return res.json({ result })
})

export default router
