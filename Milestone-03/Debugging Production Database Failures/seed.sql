-- Insert 5 real customers
INSERT INTO customers (id, name, email) VALUES
(1, 'John Doe', 'john.doe@example.com'),
(2, 'Jane Smith', 'jane.smith@example.com'),
(3, 'Bob Johnson', 'bob.johnson@example.com'),
(4, 'Alice Williams', 'alice.williams@example.com'),
(5, 'Charlie Brown', 'charlie.brown@example.com');

-- Insert products with valid nonnegative inventory counts.
INSERT INTO products (id, name, sku, inventory_count, price) VALUES
(1, 'Mechanical Keyboard', 'SKU-001', 50, 89.99),
(2, 'Wireless Mouse', 'SKU-002', 47, 25.00),
(3, 'USB-C Cable (1m)', 'SKU-003', 20, 12.50),
(4, '27-inch Monitor', 'SKU-004', 15, 299.99),
(5, 'Laptop Stand', 'SKU-005', 10, 45.00);

-- Insert normal orders
INSERT INTO orders (id, customer_id, status, total) VALUES
(1, 1, 'completed', 114.99),
(2, 2, 'pending', 299.99);

-- Additional orders reference existing customers so the foreign key is satisfied.
INSERT INTO orders (id, customer_id, status, total) VALUES
(3, 3, 'completed', 50.00),
(4, 4, 'pending', 75.00);

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 89.99),
(1, 2, 1, 25.00),
(2, 4, 1, 299.99);

-- Insert one payment per order.
INSERT INTO payments (order_id, amount, status) VALUES
(1, 114.99, 'completed'),
(2, 299.99, 'pending');

-- Continue normal sequences for SERIAL
SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));
