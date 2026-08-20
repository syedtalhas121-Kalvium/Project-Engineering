const prisma = require('./lib/db');

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function requestError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function purchaseItem(req, res) {
  const userId = parseId(req.body.userId);
  const productId = parseId(req.body.productId);

  if (userId === null || productId === null) {
    return res.status(400).json({
      error: 'userId and productId must be positive integers',
    });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw requestError('Product not found', 404);
      }

      if (product.stock < 1) {
        throw requestError('Product is out of stock', 409);
      }

      const createdOrder = await tx.order.create({
        data: { userId, productId, quantity: 1 },
      });

      const stockUpdate = await tx.product.updateMany({
        where: { id: productId, stock: { gte: 1 } },
        data: { stock: { decrement: 1 } },
      });

      if (stockUpdate.count !== 1) {
        throw requestError('Product is out of stock', 409);
      }

      return createdOrder;
    });

    return res.status(201).json({ order });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    if (err.code === 'P2003') {
      return res.status(404).json({ error: 'User or product not found' });
    }

    return res.status(500).json({ error: err.message });
  }
}

async function getOrdersByUser(req, res) {
  const userId = parseId(req.params.userId);

  if (userId === null) {
    return res.status(400).json({ error: 'User id must be a positive integer' });
  }

  try {
    const orders = await prisma.order.findMany({ where: { userId } });
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { purchaseItem, getOrdersByUser };
