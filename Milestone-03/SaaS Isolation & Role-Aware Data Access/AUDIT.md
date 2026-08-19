# CorpFlow Pre-Refactor Security Audit

This audit records the security and data-model problems found in the untouched CorpFlow starter implementation. It is intentionally committed before the schema or route refactor so that it remains the contract for the work.

## Structural and Access-Control Findings

| ID | Location | Finding | Security consequence | Remediation |
|---|---|---|---|---|
| A-01 | `schema.sql:4-6` | The reset script drops `billing_details`, `projects`, and `users`, but there is no `tenants` table. | There is no database identity for an organisation, so the database cannot distinguish one customer’s records from another’s. | Add a `tenants` table and recreate dependent tables with tenant foreign keys. |
| A-02 | `schema.sql:8-15` | `users` has no `tenant_id`, and `email` is not scoped to a tenant. | A user row is globally addressable and there is no structural boundary preventing cross-customer reads or duplicate identities from colliding. | Add `tenant_id NOT NULL REFERENCES tenants(id)` and a tenant-scoped unique constraint on `(tenant_id, email)`. |
| A-03 | `schema.sql:13` and seed rows at `schema.sql:35-39` | The role column defaults to `employee` and has no allow-list constraint. | Unexpected or misspelled roles can bypass role-aware response logic. The assignment requires the explicit `admin`, `manager`, and `user` roles. | Normalize the employee seed to `user`, add a `CHECK` constraint, and make role assignment non-null. |
| A-04 | `schema.sql:14` | `users.salary` is stored without an access-control design or documentation. | The most sensitive payroll field is exposed whenever a raw user row is selected. | Keep the field in the database, document it as admin-only, and exclude it from manager/user response mappings. |
| A-05 | `schema.sql:17-23` | `projects` has no `tenant_id`, owner relationship, or assignment relationship. | A project query can return every customer’s projects, and the schema cannot prove that a project belongs to the same organisation as its owner or assignees. | Add tenant anchoring, a tenant-safe owner foreign key, and a tenant-safe project membership table. |
| A-06 | `schema.sql:25-32` | `billing_details` has no `tenant_id`; `user_id` is only a single-column foreign key. | Billing rows can be joined or inserted without a same-tenant boundary. Billing information is exposed to any caller that can retrieve raw rows. | Add tenant anchoring, a composite same-tenant foreign key to `users`, and restrict billing endpoints/data to admins. |
| A-07 | `schema.sql:25-32` | Billing fields such as `card_last4`, `expiry_date`, and `billing_address` are not identified as sensitive. | API or future reporting code can accidentally disclose payment-related information. | Document field sensitivity and omit billing records from non-admin responses. |
| A-08 | `schema.sql:34-49` | Seed data has no organisation records and mixes Pouch.io and Velocity users in one global namespace. | The sample data demonstrates the same cross-tenant exposure the application is meant to prevent. | Seed separate tenants and assign every user, project, and billing row to one tenant. |
| A-09 | `routes/users.js:6-10` | `GET /users` executes `SELECT * FROM users` with no tenant or role boundary. | Any caller receives every user across all organisations, including password hashes and salaries. | Require tenant/role context, select only required columns, and map rows through role-aware serializers. |
| A-10 | `routes/users.js:18-27` | `GET /users/:id` filters only by global `id` and returns the raw row. | Knowing an ID allows cross-tenant profile access and exposes password hashes and salary. | Scope the query by tenant and visibility rules, then return a safe response object. |
| A-11 | `routes/projects.js:7-10` | `GET /projects` executes `SELECT * FROM projects` and returns raw rows. | Every tenant can see all project budgets and descriptions. | Scope projects by tenant and role, select explicit fields, and map to a safe project response. |
| A-12 | `routes/projects.js:18-27` | `GET /projects/:id` filters only by global `id` and returns a raw row. | A caller can retrieve another tenant’s project by ID and access budget data. | Add tenant-scoped lookup and role-based project visibility. |
| A-13 | `routes/users.js:9,21` and `routes/projects.js:9,21` | Tenant-scoped columns and relationship indexes are absent. | Secure queries would require full-table scans, increasing latency and making accidental broad queries more costly at scale. | Add indexes beginning with `tenant_id` and composite indexes for tenant-scoped lookups. |
| A-14 | `routes/projects.js:29` | The project error path calls `console.err`, which is not a Node.js function. | A database failure can trigger a second exception while handling the first, producing an unreliable error response. | Correct the logger call to `console.error`. |
| A-15 | `app.js:19-21` | Routes do not establish an authenticated tenant and role context. | Route handlers cannot enforce the required admin/manager/user visibility rules consistently. | Add a documented request-context middleware using `x-tenant-id` and `x-user-id` for this challenge API. |
| A-16 | `README.md:39-47` | Endpoint documentation does not describe tenant and role context or sensitive-field filtering. | Consumers may call the API without the required security context or assume raw database fields are available. | Document the headers, visibility matrix, response guarantees, and verification commands. |
| A-17 | Repository-wide | There are no automated isolation or response-shape tests for the CorpFlow challenge. | A future query regression could silently reintroduce cross-tenant access. | Add tests that assert tenant scoping, role visibility, and absence of secrets from responses. |

## Sensitive-Field Inventory

| Field | Table | Classification | Allowed role |
|---|---|---|---|
| `users.password_hash` | `users` | Credential secret; must never leave the API | None; internal database use only |
| `users.salary` | `users` | Payroll compensation | `admin` only |
| `billing_details.card_last4` | `billing_details` | Payment-card reference | `admin` only |
| `billing_details.expiry_date` | `billing_details` | Payment-card metadata | `admin` only |
| `billing_details.billing_address` | `billing_details` | Personal/payment address | `admin` only |
| `projects.budget` | `projects` | Financial project information | `admin` and `manager` |

## Required Role Contract

- **Admin:** may view all users, sensitive user and billing fields, and all projects within the active tenant.
- **Manager:** may view team members and team projects, but not salary, password hashes, or billing details.
- **User:** may view only their own profile and assigned projects, and may not view other user data or sensitive financial fields.

## Audit Completion Contract

Every finding above must have a corresponding schema, route, test, or documentation change. The refactor must preserve the existing endpoint paths while requiring explicit tenant and user context for protected data access.
