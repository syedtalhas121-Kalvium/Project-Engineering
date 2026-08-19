# CorpFlow Security Design

## Security boundary

CorpFlow treats `tenant_id` as the primary isolation key. Every tenant-owned table—`users`, `projects`, `project_members`, and `billing_details`—contains a non-null tenant foreign key. Every protected route requires a tenant context and authenticated user context. In this challenge implementation, those values are represented by `x-tenant-id` and `x-user-id` headers; a production deployment must derive them from a verified session or signed token rather than trusting arbitrary client input.

## Sensitive fields and response policy

| Field | Reason for protection | Admin | Manager | User |
|---|---|---:|---:|---:|
| `users.password_hash` | Credential material | Never returned | Never returned | Never returned |
| `users.salary` | Payroll compensation | Allowed | Denied | Denied |
| `billing_details.card_last4` | Payment-card reference | Allowed in a dedicated admin workflow | Denied | Denied |
| `billing_details.expiry_date` | Payment-card metadata | Allowed in a dedicated admin workflow | Denied | Denied |
| `billing_details.billing_address` | Personal and payment address | Allowed in a dedicated admin workflow | Denied | Denied |
| `projects.budget` | Financial project information | Allowed | Denied | Denied |

The current public routes do not expose billing records. If a billing route is added, it must use the same `tenant_id` boundary and an admin-only authorization check before selecting or serializing billing fields.

## Role-aware access rules

**Admin** users can read all users and projects within their tenant. Admin user responses include salary, and admin project responses include budget. Admin access never crosses the active tenant boundary.

**Manager** users can read users who share at least one project with them and can read projects to which they are assigned. Salary, password hashes, and billing fields are removed before serialization. Project budgets are also withheld as financial data.

**User** users can read only their own user profile and assigned projects. Other user IDs resolve to the authenticated user’s record for the profile endpoint, and unassigned projects are not returned. Sensitive fields are removed.

## Query and schema controls

Every protected SQL statement includes a `tenant_id` predicate. The schema additionally uses composite foreign keys such as `(tenant_id, owner_id) REFERENCES users(tenant_id, id)` so that a project cannot reference an owner from another tenant even if an application query is accidentally constructed incorrectly. Membership and billing relationships use the same composite-key pattern.

Tenant-first indexes cover list and lookup paths: users, projects, project membership, and billing details each have indexes beginning with `tenant_id`, with composite indexes for IDs, email, owners, projects, and users. This makes the secure access path the efficient access path.

## API response controls

Routes select explicit columns instead of `SELECT *`. `presentUser` and `presentProject` are the final response boundary. These serializers use the requesting role to add only fields explicitly allowed by policy, so database columns cannot leak merely because a new column is added to a table.

## Verification and residual risks

The automated tests prove missing context is rejected, cross-tenant authentication is rejected, admin results remain tenant-scoped, managers receive team-only data, users receive self/assignment-only data, sensitive fields are absent from restricted responses, and protected SQL contains tenant predicates.

Before a production deployment, replace header-based context with verified authentication, use a managed secret store for `DATABASE_URL`, add PostgreSQL Row-Level Security with a transaction-local tenant setting, and place billing access behind a dedicated audited admin route. These are deployment-hardening steps; the schema and API in this challenge already enforce the required tenant and role boundaries for the demonstrated endpoints.
