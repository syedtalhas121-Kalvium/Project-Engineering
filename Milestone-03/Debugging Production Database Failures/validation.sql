-- Run against a database initialized with schema.sql and seed.sql.

-- Clean-data checks: each query should return zero rows.
SELECT o.id, o.customer_id
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE c.id IS NULL
ORDER BY o.id;

SELECT id, name, inventory_count
FROM products
WHERE inventory_count < 0
ORDER BY id;

SELECT order_id, COUNT(*) AS payment_count
FROM payments
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY order_id;

-- Constraint checks: each block should emit a NOTICE confirming rejection.
DO $$
BEGIN
    BEGIN
        INSERT INTO orders (customer_id, total) VALUES (9999, 1.00);
        RAISE EXCEPTION 'Expected foreign-key violation was not raised';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'PASS: orphaned order rejected by orders_customer_id_fkey';
    END;

    BEGIN
        INSERT INTO products (name, sku, inventory_count, price)
        VALUES ('Invalid Product', 'INVALID-SKU', -1, 1.00);
        RAISE EXCEPTION 'Expected check violation was not raised';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'PASS: negative inventory rejected by products_inventory_count_check';
    END;

    BEGIN
        INSERT INTO payments (order_id, amount, status)
        VALUES (1, 114.99, 'pending');
        RAISE EXCEPTION 'Expected unique violation was not raised';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'PASS: duplicate payment rejected by payments_order_id_key';
    END;
END;
$$;
