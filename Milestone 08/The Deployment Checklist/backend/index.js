require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prisma');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
}

app.use(cors({
  origin: corsOrigin,
}));

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (_error) {
    res.status(503).json({ status: 'error', database: 'unavailable', timestamp: new Date().toISOString() });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed origin: ${corsOrigin}`);
});

module.exports = app;

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
