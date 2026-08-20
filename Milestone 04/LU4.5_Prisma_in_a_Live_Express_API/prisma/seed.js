const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: { name: 'Demo User' },
    create: { name: 'Demo User', email: 'demo@example.com' },
  });

  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: 1 },
      update: { name: 'Prisma Hoodie', price: 49.99, stock: 5 },
      create: { name: 'Prisma Hoodie', price: 49.99, stock: 5 },
    }),
    prisma.product.upsert({
      where: { id: 2 },
      update: { name: 'Express Mug', price: 14.99, stock: 10 },
      create: { name: 'Express Mug', price: 14.99, stock: 10 },
    }),
  ]);

  console.log(`Seeded user ${user.id} and ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
