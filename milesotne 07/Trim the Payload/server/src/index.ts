import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { prisma } from './prisma.config';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

app.use(cors());
app.use(express.json());
app.use(compression());

app.get('/api/orders', async (req, res) => {
  const requestedPage = Number.parseInt(String(req.query.page ?? '1'), 10);
  const requestedLimit = Number.parseInt(String(req.query.limit ?? DEFAULT_PAGE_SIZE), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  try {
    const total = await prisma.order.count();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;
    const orders = await prisma.order.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });

    res.json({
      data: orders,
      pagination: {
        currentPage,
        pageSize: limit,
        totalPages,
        total,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'optimized' });
});

app.listen(PORT, () => {
  console.log(`Optimized server running at http://localhost:${PORT}`);
});
