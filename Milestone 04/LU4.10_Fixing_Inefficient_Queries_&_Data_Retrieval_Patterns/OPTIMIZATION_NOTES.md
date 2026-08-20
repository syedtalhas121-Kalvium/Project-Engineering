# Nexus Supermarket API Optimization Notes

This challenge keeps the existing endpoints and Prisma schema intact while removing the three production risks identified in the starter project.

## `GET /products`

The list endpoint now accepts `page`, `limit`, `sortBy`, `order`, and `fields`. Pagination defaults to page 1 with 20 records and enforces a maximum limit of 100. Page and limit must be positive integers. Sorting is restricted to known Product columns and the order must be `asc` or `desc`.

The `fields` parameter is parsed against an explicit Product-field whitelist. Unknown or empty fields return HTTP 400 rather than reaching Prisma. The endpoint returns the paginated records under `data` and pagination metadata under `meta`, including the total record count and number of pages.

Examples:

```text
GET /products?page=2&limit=10&sortBy=price&order=asc&fields=id,name,price
GET /products?limit=100
```

## `GET /orders`

The list and detail queries load public user fields through Prisma's relation `include`. The previous `orders.map()` loop and per-order `user.findUnique()` calls have been removed. With Prisma query logging enabled in the service, the list endpoint can be checked in development to confirm that user data is loaded as part of the order query rather than through an application-level N+1 loop. Sensitive `passwordHash` data is not selected.

## Verification performed

The edited JavaScript files pass Node syntax checks, the Prisma schema passes `prisma validate`, the service modules load after Prisma Client generation, and static assertions confirm the pagination guard, field whitelist, metadata, Prisma include, and removal of the N+1 loop.

For a live database demonstration, set `DATABASE_URL`, run `npx prisma db push`, run `npm run seed`, and start the API with `npm start`.
