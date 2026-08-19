-- NORMALIZED DATABASE SCHEMA
-- E-commerce product catalog redesigned to Third Normal Form (3NF).
--
-- Design notes:
-- * Products contains only product attributes and a supplier foreign key.
-- * Suppliers, categories, tags, and warehouses are independent entities.
-- * Product-category and product-tag tables resolve many-to-many relationships.
-- * Inventory resolves the product-to-warehouse relationship and stores stock
--   for each product at each warehouse.
-- * All identifiers are supplied by the application/import process so the DDL
--   remains portable across common SQL databases.

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    supplier_phone VARCHAR(20),
    supplier_email VARCHAR(100),
    CONSTRAINT uq_suppliers_email UNIQUE (supplier_email)
);

CREATE TABLE IF NOT EXISTS products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    supplier_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT ck_products_price_nonnegative CHECK (price >= 0),
    CONSTRAINT fk_products_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
);

CREATE TABLE IF NOT EXISTS categories (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_categories_name UNIQUE (category_name)
);

CREATE TABLE IF NOT EXISTS product_categories (
    product_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (product_id, category_id),
    CONSTRAINT fk_product_categories_product
        FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT fk_product_categories_category
        FOREIGN KEY (category_id) REFERENCES categories (category_id)
);

CREATE TABLE IF NOT EXISTS tags (
    tag_id INT PRIMARY KEY,
    tag_name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_tags_name UNIQUE (tag_name)
);

CREATE TABLE IF NOT EXISTS product_tags (
    product_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (product_id, tag_id),
    CONSTRAINT fk_product_tags_product
        FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT fk_product_tags_tag
        FOREIGN KEY (tag_id) REFERENCES tags (tag_id)
);

CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id INT PRIMARY KEY,
    warehouse_location VARCHAR(100) NOT NULL,
    CONSTRAINT uq_warehouses_location UNIQUE (warehouse_location)
);

CREATE TABLE IF NOT EXISTS inventory (
    product_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, warehouse_id),
    CONSTRAINT ck_inventory_stock_nonnegative CHECK (stock_quantity >= 0),
    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT fk_inventory_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses (warehouse_id)
);

-- Foreign-key indexes improve joins and referential lookups. The composite
-- primary keys already index their relationship tables for both common access
-- paths beginning with product_id.
CREATE INDEX IF NOT EXISTS idx_products_supplier_id
    ON products (supplier_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_category_id
    ON product_categories (category_id);

CREATE INDEX IF NOT EXISTS idx_product_tags_tag_id
    ON product_tags (tag_id);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id
    ON inventory (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
    ON inventory (stock_quantity, product_id);
