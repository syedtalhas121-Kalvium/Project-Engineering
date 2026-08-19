# Debug Report: Production Database Failures

## Executive Summary

OrderFlow had three production data-integrity failures. The application continued to return responses, but the database schema allowed records that contradicted the business rules described in the repository README. I reproduced each symptom with SQL before changing the schema, traced each symptom through the relevant route and table, applied the protection at the database boundary, and re-ran the checks against a clean database.

| Bug | Symptom | Root cause | Schema-level fix | Validation result |
|---|---|---|---|---|
| Orphaned orders | Orders 3 and 4 had `customer_id = 9999`, so the orders endpoint returned a `NULL` customer name. | `orders.customer_id` was nullable and had no foreign key to `customers.id`. | `NOT NULL REFERENCES customers(id)` on `orders.customer_id`. | Orphan query returns 0 rows; an insert using customer 9999 is rejected. |
| Negative inventory | Products 2 and 3 had inventory counts of `-3` and `-5`. | `products.inventory_count` had no nonnegative `CHECK` constraint. | `NOT NULL DEFAULT 0 CHECK (inventory_count >= 0)`. | Negative-inventory query returns 0 rows; an insert of `-1` is rejected. |
| Duplicate payments | Order 1 had both `pending` and `completed` payments. | `payments.order_id` was not unique and had no foreign key to `orders.id`. | `NOT NULL UNIQUE REFERENCES orders(id)` on `payments.order_id`. | Duplicate-payment query returns 0 rows; a second payment for order 1 is rejected. |

## Investigation Method

The investigation followed the required sequence for each failure: reproduce the symptom, trace the data flow, identify the structural root cause, apply a schema fix, validate the clean result, and attempt the previously invalid write. The baseline reproduction was run against the original starter schema and seed data before the changes in this branch.

## Bug 1: Orphaned Orders

### Symptom and reproduction

The orders route in [`routes/orders.js`](routes/orders.js) uses a `LEFT JOIN` from `orders` to `customers`. In the original database, this query exposed orders whose recorded customer ID did not match any customer:

```sql
SELECT o.id, o.customer_id
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE c.id IS NULL
ORDER BY o.id;
```

The baseline result was:

```text
 id | customer_id
----+-------------
  3 |        9999
  4 |        9999
```

The API therefore returned those orders with a `NULL` value for `customer_name`, even though each order row contained a customer ID.

### Data-flow trace

1. A client calls `GET /orders`.
2. [`routes/orders.js`](routes/orders.js) selects `orders.customer_id` and the customer name through a `LEFT JOIN`.
3. The `orders` table contains the invalid value `customer_id = 9999` for orders 3 and 4.
4. The original [`seed.sql`](seed.sql) inserted those rows, and the original [`schema.sql`](schema.sql) allowed them because `customer_id` had neither `NOT NULL` nor a foreign key constraint.
5. The join cannot find a matching row in `customers`, so `customer_name` becomes `NULL`.

### Root cause

The exact root cause was a missing referential-integrity constraint on `orders.customer_id`. The column was nullable and did not reference `customers(id)`, so the database accepted a customer ID that did not exist.

### Fix applied

The orders definition now enforces both presence and referential validity:

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status VARCHAR(20) DEFAULT 'pending',
    total DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

The seed data now uses existing customers 3 and 4 for orders 3 and 4. This preserves the sample orders without reintroducing invalid data.

### Validation

The reproduction query was re-run after rebuilding the database:

```sql
SELECT o.id, o.customer_id
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE c.id IS NULL
ORDER BY o.id;
```

Result: **0 rows**.

The formerly invalid write was then attempted:

```sql
INSERT INTO orders (customer_id, total)
VALUES (9999, 1.00);
```

PostgreSQL rejected it with:

```text
ERROR: insert or update on table "orders" violates foreign key constraint "orders_customer_id_fkey"
DETAIL: Key (customer_id)=(9999) is not present in table "customers".
```

## Bug 2: Negative Inventory

### Symptom and reproduction

The order-item route in [`routes/order_items.js`](routes/order_items.js) decrements inventory with an arithmetic `UPDATE`. The original table definition did not protect the resulting value. The baseline query was:

```sql
SELECT id, name, inventory_count
FROM products
WHERE inventory_count < 0
ORDER BY id;
```

The baseline result was:

```text
 id |       name       | inventory_count
----+------------------+-----------------
  2 | Wireless Mouse   |              -3
  3 | USB-C Cable (1m) |              -5
```

### Data-flow trace

1. A client calls `POST /order_items` with an order, product, and quantity.
2. [`routes/order_items.js`](routes/order_items.js) inserts the order item and then executes `inventory_count = inventory_count - quantity` on `products`.
3. The original [`seed.sql`](seed.sql) already contained negative inventory values for products 2 and 3.
4. The original `products.inventory_count` column had a default but no `CHECK` constraint, so both seeded values and future decrements below zero were accepted.
5. A later `GET /products` call returned the invalid negative count to the client.

### Root cause

The exact root cause was the missing database invariant on `products.inventory_count`. The column allowed negative integers because it had no `CHECK (inventory_count >= 0)` constraint. It was also nullable, which did not match the warehouse rule that every product must have a usable inventory count.

### Fix applied

The products definition now enforces a present, nonnegative inventory value:

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    inventory_count INTEGER NOT NULL DEFAULT 0 CHECK (inventory_count >= 0),
    price DECIMAL(10,2) NOT NULL
);
```

The seed values were corrected to valid nonnegative counts while retaining the same five products.

### Validation

The reproduction query was re-run after rebuilding the database:

```sql
SELECT id, name, inventory_count
FROM products
WHERE inventory_count < 0
ORDER BY id;
```

Result: **0 rows**.

The formerly invalid write was then attempted:

```sql
INSERT INTO products (name, sku, inventory_count, price)
VALUES ('Invalid Product', 'INVALID-SKU', -1, 1.00);
```

PostgreSQL rejected it with:

```text
ERROR: new row for relation "products" violates check constraint "products_inventory_count_check"
DETAIL: Failing row contains (6, Invalid Product, INVALID-SKU, -1, 1.00).
```

## Bug 3: Duplicate Payments

### Symptom and reproduction

The payments route in [`routes/payments.js`](routes/payments.js) inserts a payment for an order and the payment-history endpoint returns every record for that order. The baseline query was:

```sql
SELECT order_id,
       COUNT(*) AS payment_count,
       STRING_AGG(status, ', ' ORDER BY created_at) AS statuses
FROM payments
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY order_id;
```

The baseline result was:

```text
 order_id | payment_count |      statuses
----------+---------------+--------------------
        1 |             2 | pending, completed
```

### Data-flow trace

1. A client calls `POST /payments` with an order ID, amount, and status.
2. [`routes/payments.js`](routes/payments.js) inserts a row into `payments` without checking whether that order already has a payment.
3. The original [`seed.sql`](seed.sql) inserted two records for order 1: one `pending` and one `completed`.
4. The original `payments.order_id` was required to be present but was neither unique nor linked to `orders(id)`.
5. A client calling `GET /payments/1` received both rows, creating an ambiguous payment state for a single order.

### Root cause

The exact root cause was the missing one-to-one relationship constraint on `payments.order_id`. Without `UNIQUE`, the database treated multiple payment rows for one order as valid. Without a foreign key, a payment could also reference an order that did not exist.

### Fix applied

The payments definition now enforces one valid payment per order:

```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

The seed data now contains one payment per order. Order 1 is seeded as `completed`, and order 2 is seeded as `pending`.

### Validation

The reproduction query was re-run after rebuilding the database:

```sql
SELECT order_id, COUNT(*) AS payment_count
FROM payments
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY order_id;
```

Result: **0 rows**.

The formerly invalid write was then attempted:

```sql
INSERT INTO payments (order_id, amount, status)
VALUES (1, 114.99, 'pending');
```

PostgreSQL rejected it with:

```text
ERROR: duplicate key value violates unique constraint "payments_order_id_key"
DETAIL: Key (order_id)=(1) already exists.
```

## Final Validation Summary

The fixed database was rebuilt from [`schema.sql`](schema.sql) and [`seed.sql`](seed.sql). All three clean-data queries returned zero rows, and each invalid write was rejected by the intended constraint. The constraint catalog also confirmed `orders_customer_id_fkey`, `products_inventory_count_check`, and `payments_order_id_key` are present.

The application routes were intentionally left unchanged. The assignment requires a root-cause fix at the schema level; the corrected constraints protect the data even if a future application path repeats the original mistake.

## References

1. [`README.md`](README.md) — OrderFlow challenge description, known symptoms, and API behavior.
2. [`schema.sql`](schema.sql) — Corrected database schema and constraints.
3. [`seed.sql`](seed.sql) — Corrected sample data.
4. [`routes/orders.js`](routes/orders.js) — Order listing and creation data flow.
5. [`routes/order_items.js`](routes/order_items.js) — Inventory decrement data flow.
6. [`routes/payments.js`](routes/payments.js) — Payment creation and retrieval data flow.
