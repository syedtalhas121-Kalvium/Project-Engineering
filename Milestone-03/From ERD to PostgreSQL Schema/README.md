# TaskBridge: From ERD to PostgreSQL Schema

This submission corrects the flawed TaskBridge entity relationship diagram and translates the corrected design into an executable PostgreSQL schema. The final design models users, projects, and tasks while enforcing the required ownership and project-membership relationships at the database layer.

## Problems in the Original ERD

The original diagram contains several design and implementation issues. The primary-key intent is not consistently expressed, and the relationships are incomplete: `tasks.user_id` should reference `users.id`, while `tasks.project_id` should reference `projects.project_id`. Without foreign keys, the database could contain tasks that point to users or projects that do not exist.

The `tasks.task_owner_name` attribute is redundant because task ownership is already represented by `user_id`. Storing both values creates an update anomaly: a user can change their name while old task rows continue to contain a stale copy. The corrected design stores the relationship once and retrieves the current user name through a join.

The original diagram also lacks important integrity constraints. Required identifiers and relationship columns should not be nullable, user email addresses should be unique, and human-readable names and titles should not be accepted as blank strings. These rules are now expressed explicitly in `schema.sql`.

## Corrected Design

The corrected ERD is included as [`corrected_erd.png`](./corrected_erd.png). It has three normalized entities with the following responsibilities:

| Entity | Primary key | Important attributes | Relationships |
| --- | --- | --- | --- |
| `users` | `id` | `name`, unique `email` | A user may be assigned many tasks. |
| `projects` | `project_id` | `name`, optional `description` | A project may contain many tasks. |
| `tasks` | `task_id` | `title`, required `user_id`, required `project_id` | Each task belongs to exactly one user and one project. |

The one-to-many relationships are represented by foreign keys on the many-side table, `tasks`. `tasks.user_id` references `users.id`, and `tasks.project_id` references `projects.project_id`. The redundant `task_owner_name` column has been removed.

## Database Schema Explanation

The complete implementation is in [`schema.sql`](./schema.sql). Each table has a generated integer identifier and a primary key. Required fields use `NOT NULL`; user email uses `UNIQUE`; and check constraints reject blank names and titles. The two foreign keys are also declared `NOT NULL`, which guarantees that every task has both an owner and a project.

The deletion behavior is intentional. User deletion is restricted while tasks still reference that user, protecting task ownership history. Project deletion cascades to its tasks because tasks are contained within a project in this model. Indexes on both foreign-key columns support common lookups by owner and project.

> The schema begins with a transaction and removes existing copies of the three classroom tables so it can be executed repeatedly during verification. A production migration would normally use a migration framework rather than destructive reset statements.

## PostgreSQL Verification

Create a database and execute the schema with PostgreSQL:

```bash
createdb taskbridge
psql -U <your_username> -d taskbridge -f schema.sql
```

Inspect the resulting tables and constraints:

```text
\dt
\d users
\d projects
\d tasks
```

The expected result is three tables. `users`, `projects`, and `tasks` each have a primary key; `users.email` is unique; and `tasks` has foreign keys to both parent tables. The relationship columns are non-nullable, so PostgreSQL rejects orphaned tasks and tasks without an owner or project.

## Files

| File | Purpose |
| --- | --- |
| [`corrected_erd.png`](./corrected_erd.png) | Corrected ER diagram with primary keys, foreign keys, constraints, and cardinalities. |
| [`schema.sql`](./schema.sql) | Executable PostgreSQL schema. |
| [`README.md`](./README.md) | Analysis, design explanation, and verification instructions. |

## References

[1]: https://www.postgresql.org/docs/current/ddl-constraints.html "PostgreSQL Documentation: Constraints"
[2]: https://www.postgresql.org/docs/current/ddl-basics.html "PostgreSQL Documentation: Table Basics"

The schema follows PostgreSQL’s documented constraint model for primary keys, unique constraints, check constraints, and foreign keys [1]. The table definitions and generated identity columns follow the PostgreSQL table-definition conventions [2].
