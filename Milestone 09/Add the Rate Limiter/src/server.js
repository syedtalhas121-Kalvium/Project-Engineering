// src/server.js
import express from 'express'
import dotenv from 'dotenv'
import noteRoutes from './routes/noteRoutes.js'
import placementRoutes from './routes/placementRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

function validateEnv() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is required')
  }
}

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/notes', noteRoutes)
app.use('/placements', placementRoutes)

validateEnv()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
