import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const PRODUCT_FIELDS = [
  'id',
  'name',
  'description',
  'price',
  'category',
  'stock',
  'imageUrl',
  'isActive',
  'createdAt',
  'updatedAt',
];

const SORTABLE_FIELDS = new Set(['id', 'name', 'price', 'category', 'stock', 'createdAt', 'updatedAt']);
const SORT_ORDERS = new Set(['asc', 'desc']);

export class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
  }
}

function parsePositiveInteger(value, parameterName, { maximum } = {}) {
  if (value === undefined) return undefined;

  const stringValue = String(value).trim();
  if (!/^\d+$/.test(stringValue)) {
    throw new BadRequestError(`${parameterName} must be a positive integer`);
  }

  const parsedValue = Number(stringValue);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    throw new BadRequestError(`${parameterName} must be a positive integer`);
  }
  if (maximum !== undefined && parsedValue > maximum) {
    throw new BadRequestError(`${parameterName} must be no greater than ${maximum}`);
  }

  return parsedValue;
}

function parseFields(fieldsQuery) {
  if (fieldsQuery === undefined) {
    return Object.fromEntries(PRODUCT_FIELDS.map((field) => [field, true]));
  }

  const requestedFields = String(fieldsQuery)
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

  if (requestedFields.length === 0) {
    throw new BadRequestError('fields must contain at least one product field');
  }

  const invalidFields = requestedFields.filter((field) => !PRODUCT_FIELDS.includes(field));
  if (invalidFields.length > 0) {
    throw new BadRequestError(`Invalid product field(s): ${invalidFields.join(', ')}`);
  }

  return Object.fromEntries([...new Set(requestedFields)].map((field) => [field, true]));
}

function parseProductQuery(query = {}) {
  const page = parsePositiveInteger(query.page, 'page') ?? 1;
  const limit = parsePositiveInteger(query.limit, 'limit', { maximum: MAX_LIMIT }) ?? DEFAULT_LIMIT;
  const sortBy = query.sortBy === undefined ? 'createdAt' : String(query.sortBy);
  const order = query.order === undefined ? 'desc' : String(query.order).toLowerCase();

  if (!SORTABLE_FIELDS.has(sortBy)) {
    throw new BadRequestError(`sortBy must be one of: ${[...SORTABLE_FIELDS].join(', ')}`);
  }
  if (!SORT_ORDERS.has(order)) {
    throw new BadRequestError('order must be either asc or desc');
  }

  return {
    page,
    limit,
    sortBy,
    order,
    select: parseFields(query.fields),
  };
}

export async function getProducts(query = {}) {
  const { page, limit, sortBy, order, select } = parseProductQuery(query);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) {
    throw new BadRequestError('page is too large for the requested limit');
  }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
      select,
    }),
    prisma.product.count(),
  ]);

  return {
    data: products,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      sortBy,
      order,
    },
  };
}

export async function getProductById(id) {
  return prisma.product.findUnique({ where: { id } });
}

export { MAX_LIMIT, PRODUCT_FIELDS, SORTABLE_FIELDS };
