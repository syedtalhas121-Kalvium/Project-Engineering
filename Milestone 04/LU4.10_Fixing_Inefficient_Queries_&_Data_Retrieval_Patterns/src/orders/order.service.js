import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query'],
});

const USER_PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
};

const orderWithUser = {
  user: {
    select: USER_PUBLIC_FIELDS,
  },
};

export async function getOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: orderWithUser,
  });
}

export async function getOrderById(id) {
  return prisma.order.findUnique({
    where: { id },
    include: orderWithUser,
  });
}
