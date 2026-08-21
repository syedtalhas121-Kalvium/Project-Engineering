// src/routes/placementRoutes.js
import express from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import aiRateLimit from '../middleware/aiRateLimit.js'
import { validatePlacementStructure } from '../middleware/validateAIInput.js'
import { structurePlacementController } from '../controllers/placementController.js'

const router = express.Router()
router.post('/:id/structure', authMiddleware, aiRateLimit, validatePlacementStructure, structurePlacementController)
export default router
