# TaskSphere Schema Review

## Original design problems

The original diagram and SQL define `Users`, `Projects`, `Tasks`, and `UserProjects`, but none of the tables has a primary key. As a result, duplicate users, projects, tasks, and memberships can be inserted, and there is no stable identifier for application code to reference.

The original SQL also uses invalid or inappropriate data types such as `ID(100)`, `VAR(100)`, and `INT(100)` for textual values. `INT(100)` does not represent a task name, and fixed-width `CHAR(100)` values can introduce padded strings. The corrected design uses PostgreSQL identity columns for identifiers and appropriately sized `VARCHAR` columns for text.

No foreign-key constraints exist. The diagram shows relationships by names rather than by identifiers, so a task can reference a non-existent user or project, and a membership can reference records that do not exist. The corrected design uses explicit foreign keys from projects to owners, tasks to projects and assignees, and memberships to both users and projects.

The original schema repeats natural-language attributes such as `project_name` and `user_name` across multiple tables. Names are mutable and are not guaranteed to be unique, which makes joins fragile and creates update anomalies. The corrected design stores stable numeric keys and retains descriptive names only in their owning entity tables.

`UserProjects` represents the many-to-many relationship between users and projects, but it has no composite key or uniqueness rule. The corrected design uses `(user_id, project_id)` as its primary key, preventing duplicate memberships while allowing a user to participate in many projects and a project to have many members.

The original design has no `NOT NULL`, `UNIQUE`, `CHECK`, or default constraints. The corrected design requires essential values, enforces unique email addresses, constrains task status and membership role to known values, rejects blank names, and supplies safe defaults.

The original schema provides no indexing strategy. The corrected design adds indexes for task lookup by project, assignee, and project/status, plus the project-side membership access path. Primary keys and unique constraints also create supporting indexes.

## Corrected relationships

| Relationship | Cardinality | Implementation |
|---|---:|---|
| User owns projects | One-to-many | `projects.owner_id → users.user_id` |
| User joins projects | Many-to-many | `user_projects(user_id, project_id)` |
| Project contains tasks | One-to-many | `tasks.project_id → projects.project_id` |
| User is assigned tasks | One-to-many, optional on task | `tasks.assigned_user_id → users.user_id` through a composite membership check |

The composite foreign key `(project_id, assigned_user_id) → user_projects(project_id, user_id)` ensures that an assigned user is a member of the same project as the task. Because `assigned_user_id` is nullable, unassigned tasks are allowed without weakening referential integrity for assigned tasks.

## Normalization result

The corrected model is substantially closer to Third Normal Form. Each table represents one entity or relationship, every non-key attribute depends on the whole key, and descriptive user/project values are not duplicated in relationship tables. The junction table contains only membership attributes that depend on its complete composite key.
