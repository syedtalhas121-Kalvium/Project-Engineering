-- PRODUCT QUERIES FOR schema/normalized_schema.sql
-- The normalized design removes comma-separated values and repeated groups.
-- Queries therefore use joins through the relationship tables where needed.

-- Query 1: Get every product with its supplier.
SELECT
    p.product_id,
    p.product_name,
    p.price,
    s.supplier_name,
    s.supplier_phone,
    s.supplier_email
FROM products AS p
JOIN suppliers AS s
    ON s.supplier_id = p.supplier_id
ORDER BY p.product_id;

-- Query 2: Find products assigned to a specific category.
-- The DISTINCT protects the result if additional product relationships are
-- joined in the future; the composite key already prevents duplicate pairs.
SELECT DISTINCT
    p.product_id,
    p.product_name,
    p.price
FROM products AS p
JOIN product_categories AS pc
    ON pc.product_id = p.product_id
JOIN categories AS c
    ON c.category_id = pc.category_id
WHERE c.category_name = 'Electronics'
ORDER BY p.product_name;

-- Query 3: Find supplier details for every product.
SELECT
    p.product_name,
    s.supplier_name,
    s.supplier_phone,
    s.supplier_email
FROM products AS p
JOIN suppliers AS s
    ON s.supplier_id = p.supplier_id
ORDER BY p.product_name;

-- Query 4: Find products whose stock is below the threshold in any warehouse.
SELECT
    p.product_name,
    w.warehouse_location,
    i.stock_quantity
FROM products AS p
JOIN inventory AS i
    ON i.product_id = p.product_id
JOIN warehouses AS w
    ON w.warehouse_id = i.warehouse_id
WHERE i.stock_quantity < 10
ORDER BY i.stock_quantity ASC, p.product_name;

-- Query 5: Return a product's categories without storing a list in products.
SELECT
    p.product_id,
    p.product_name,
    c.category_name
FROM products AS p
JOIN product_categories AS pc
    ON pc.product_id = p.product_id
JOIN categories AS c
    ON c.category_id = pc.category_id
WHERE p.product_id = :product_id
ORDER BY c.category_name;

-- Query 6: Return a product's tags without storing a list in products.
SELECT
    p.product_id,
    p.product_name,
    t.tag_name
FROM products AS p
JOIN product_tags AS pt
    ON pt.product_id = p.product_id
JOIN tags AS t
    ON t.tag_id = pt.tag_id
WHERE p.product_id = :product_id
ORDER BY t.tag_name;