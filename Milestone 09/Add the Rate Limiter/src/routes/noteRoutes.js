// src/routes/noteRoutes.js
import express from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import aiRateLimit from '../middleware/aiRateLimit.js'
import { validateNoteSummarize } from '../middleware/validateAIInput.js'
import { summarizeNoteController } from '../controllers/noteController.js'

const router = express.Router()
router.post('/:id/summarize', authMiddleware, aiRateLimit, validateNoteSummarize, summarizeNoteController)
export default router
