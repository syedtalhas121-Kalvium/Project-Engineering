import rateLimit from 'express-rate-limit'

const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  handler: (req, res) => res.status(429).json({
    error: true,
    message: 'AI request limit reached. Try again in 60 minutes.',
    statusCode: 429,
    retryAfter: 3600
  })
})

export default aiRateLimit
