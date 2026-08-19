# Database Normalization Analysis

## Objective

The original product table combined product, supplier, category, tag, and inventory data. This design was easy to prototype but did not provide atomic values, clear entity boundaries, or dependable update behavior. The replacement schema in `schema/normalized_schema.sql` separates those concerns and keeps the application queries functional through explicit joins.

## Problems in the original design

| Original column or design choice | Normalization issue | Resulting risk |
| --- | --- | --- |
| `categories` as a comma-separated string | Violates **1NF** because one column stores a list of values | Category filtering requires string matching and makes one category difficult to update safely |
| `product_tags` as a comma-separated string | Violates **1NF** because tags are multi-valued | Tags cannot be constrained, indexed, or joined as individual values |
| `supplier_name`, `supplier_phone`, and `supplier_email` in `products` | Supplier attributes are dependent on `supplier_id` conceptually, not on each product | The same supplier is duplicated across products, creating update and insertion anomalies |
| `warehouse_location` and `stock_quantity` in `products` | Inventory is a separate business entity and a product may exist in multiple warehouses | The design cannot represent multiple stock records without adding repeated columns or rows with duplicated product data |
| No foreign keys or relationship tables | Relationships are implicit rather than enforced | Invalid supplier, category, tag, or warehouse references can enter the database |
| No supporting indexes on foreign keys | Joins and relationship lookups become more expensive as data grows | Read performance can degrade as the catalog expands |

## Redesigned schema

The normalized design uses the following entities and relationships:

| Table | Responsibility | Key relationship |
| --- | --- | --- |
| `products` | Product identity, price, and supplier reference | Each product references one supplier |
| `suppliers` | Supplier contact information | One supplier can provide many products |
| `categories` | One category per row | Categories connect to products through `product_categories` |
| `product_categories` | Product-to-category bridge | Composite primary key prevents duplicate assignments |
| `tags` | One tag per row | Tags connect to products through `product_tags` |
| `product_tags` | Product-to-tag bridge | Composite primary key prevents duplicate assignments |
| `warehouses` | Warehouse identity and location | Warehouses connect to products through `inventory` |
| `inventory` | Stock quantity for one product at one warehouse | Composite primary key identifies the stock record |

## Why the design satisfies 3NF

The schema satisfies **1NF** because each column holds a single value and each table has a key that identifies a row. It satisfies **2NF** because the bridge tables use composite keys while containing no attributes that depend on only part of those keys. For example, `product_categories` contains only the relationship, so neither `product_id` nor `category_id` has a partial dependency.

It satisfies **3NF** because non-key attributes depend on the key, the whole key, and nothing but the key. Supplier contact details depend only on `supplier_id`; category names depend only on `category_id`; warehouse locations depend only on `warehouse_id`; and stock quantity depends on the complete `(product_id, warehouse_id)` key. Product attributes remain dependent only on `product_id`.

## Query and performance trade-offs

Normalization removes duplicated values and improves write consistency, but it increases read complexity because category, tag, supplier, and inventory information is retrieved with joins. The updated queries demonstrate that trade-off directly. Primary keys and unique constraints provide lookup indexes, while the additional foreign-key and low-stock indexes support the common join and filtering paths used by the application.

Indexes improve reads but add storage and write-maintenance cost. The `idx_inventory_low_stock` index is included because low-stock monitoring is an explicit workload in the challenge; in a production system, its benefit should be confirmed with query plans and real workload measurements before adding more indexes or denormalized reporting structures.
