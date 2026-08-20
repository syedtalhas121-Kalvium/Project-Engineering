const prisma = require('./lib/db');

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getProducts(req, res) {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getProductById(req, res) {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Product id must be a positive integer' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(product);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { getProducts, getProductById };
