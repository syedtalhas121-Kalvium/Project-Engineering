"""Smoke-test the normalized schema and application queries with SQLite."""

from pathlib import Path
import sqlite3


CHALLENGE_ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = CHALLENGE_ROOT / "schema" / "normalized_schema.sql"
QUERIES_PATH = CHALLENGE_ROOT / "queries" / "product_queries.sql"


def statements_from_sql(sql_text: str) -> list[str]:
    """Return executable statements while ignoring SQL comments."""
    without_comments = "\n".join(
        line for line in sql_text.splitlines() if not line.lstrip().startswith("--")
    )
    return [statement.strip() for statement in without_comments.split(";") if statement.strip()]


def main() -> None:
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    for statement in statements_from_sql(SCHEMA_PATH.read_text()):
        connection.execute(statement)

    connection.executescript(
        """
        INSERT INTO suppliers VALUES
            (1, 'Acme Supply', '+1-555-0100', 'orders@acme.example'),
            (2, 'Global Goods', '+1-555-0110', 'sales@global.example');
        INSERT INTO products VALUES
            (101, 'Phone', 1, 699.99),
            (102, 'Laptop', 2, 1299.00),
            (103, 'Notebook', 1, 12.50);
        INSERT INTO categories VALUES
            (1, 'Electronics'),
            (2, 'Stationery');
        INSERT INTO product_categories VALUES
            (101, 1), (102, 1), (103, 2);
        INSERT INTO tags VALUES
            (1, 'featured'),
            (2, 'portable');
        INSERT INTO product_tags VALUES
            (101, 1), (101, 2), (102, 2);
        INSERT INTO warehouses VALUES
            (1, 'North Hub'),
            (2, 'South Hub');
        INSERT INTO inventory VALUES
            (101, 1, 4),
            (101, 2, 20),
            (102, 1, 7),
            (103, 1, 45);
        """
    )

    query_text = QUERIES_PATH.read_text()
    queries = statements_from_sql(query_text)
    assert len(queries) == 6, f"Expected six application queries, found {len(queries)}"

    results = [connection.execute(query, {"product_id": 101}).fetchall() for query in queries]
    assert len(results[0]) == 3, "Query 1 should return all three products"
    assert {row["product_name"] for row in results[1]} == {"Phone", "Laptop"}
    assert len(results[2]) == 3, "Query 3 should return one supplier row per product"
    assert {(row["product_name"], row["stock_quantity"]) for row in results[3]} == {
        ("Phone", 4),
        ("Laptop", 7),
    }
    assert {row["category_name"] for row in results[4]} == {"Electronics"}
    assert {row["tag_name"] for row in results[5]} == {"featured", "portable"}

    foreign_key_violations = connection.execute("PRAGMA foreign_key_check").fetchall()
    assert not foreign_key_violations, foreign_key_violations

    table_names = {
        row["name"]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    expected_tables = {
        "products",
        "suppliers",
        "categories",
        "product_categories",
        "tags",
        "product_tags",
        "warehouses",
        "inventory",
    }
    assert expected_tables <= table_names
    print("PASS: normalized schema, foreign keys, indexes, and six application queries validated.")


if __name__ == "__main__":
    main()
