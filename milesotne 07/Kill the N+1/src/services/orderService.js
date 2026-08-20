import prisma from '../../lib/prisma.js';

export async function getAllOrdersWithItems() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        select: { id: true, productName: true, quantity: true, price: true },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    reference: order.reference,
    status: order.status,
    createdAt: order.createdAt,
    items: order.items,
  }));
}
