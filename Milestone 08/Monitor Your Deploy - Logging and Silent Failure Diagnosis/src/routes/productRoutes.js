import express from 'express';
import { getProducts } from '../controllers/productController.js';

const productRoutes = ({ productModel } = {}) => {
  const router = express.Router();
  router.get('/', getProducts({ productModel }));
  return router;
};

export default productRoutes;
