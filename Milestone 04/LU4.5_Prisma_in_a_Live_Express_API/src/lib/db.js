const { PrismaClient } = require('@prisma/client');

/**
 * Keep one PrismaClient instance per Node.js process so all controllers share
 * one connection pool instead of opening a new pool for every module/request.
 */
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
