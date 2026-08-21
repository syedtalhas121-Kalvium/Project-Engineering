import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import productRoutes from './routes/productRoutes.js';
import Product from './models/Product.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockapi';

/**
 * Build the Express application. Model injection makes the HTTP layer easy
 * to verify locally without requiring a production database connection.
 */
export const createApp = ({ productModel = Product } = {}) => {
  const app = express();
  const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

  app.use(cors());
  app.use(express.json());
  // Register Morgan before routes so every request leaves evidence.
  app.use(morgan(morganFormat));
  app.use('/api/products', productRoutes({ productModel }));

  return app;
};

export const startServer = async ({ port = PORT, productModel = Product } = {}) => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const app = createApp({ productModel });
    return app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Database connection failed:', err.message, {
      timestamp: new Date().toISOString()
    });
    process.exitCode = 1;
    throw err;
  }
};

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(() => {
    // The detailed failure has already been written by the catch block above.
  });
}
