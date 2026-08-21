import Product from '../models/Product.js';

export const getProducts = ({ productModel = Product } = {}) => async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const products = await productModel.find(filter);
    res.json(products);
  } catch (err) {
    console.error('getProducts failed:', err.message, {
      category: req.query.category ?? null,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Server error' });
  }
};
