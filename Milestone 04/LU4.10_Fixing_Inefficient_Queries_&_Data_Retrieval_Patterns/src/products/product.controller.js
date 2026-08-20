import { getProducts, getProductById, BadRequestError } from './product.service.js';

export async function listProducts(req, res) {
  try {
    const products = await getProducts(req.query);
    res.json(products);
  } catch (err) {
    if (err instanceof BadRequestError || err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }

    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function getProduct(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await getProductById(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
