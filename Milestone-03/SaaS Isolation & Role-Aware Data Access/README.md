# CorpFlow Workforce Management API (v2.0)

CorpFlow is a tenant-isolated workforce management API for organisations that manage employee profiles, projects, payroll, and billing data in one shared PostgreSQL database. The refactor makes the database boundary structural and keeps sensitive fields behind explicit role-aware response serializers.

## Security model

Every tenant-owned table has a non-null `tenant_id`. Relationships use composite foreign keys containing `tenant_id`, which prevents a project, project membership, or billing record from referencing a user in a different tenant. Protected endpoints require both `x-tenant-id` and `x-user-id` headers. These headers are a challenge-friendly stand-in for values that a production authentication layer would derive from a verified session or signed token.

The supported roles are `admin`, `manager`, and `user`. Admins can see all tenant users and projects, including salary and project budget. Managers can see their project teams and assigned projects, without salary, billing, credential, or budget fields. Users can see only their own profile and assigned projects. No response contains `password_hash`.

See [AUDIT.md](./AUDIT.md) for the pre-refactor findings and [SECURITY.md](./SECURITY.md) for the complete security decision record.

## Getting started

### Prerequisites

Node.js 18 or newer and PostgreSQL 14 or newer are required.

### Database setup

Create a PostgreSQL database named `corpflow`, configure `DATABASE_URL`, and run the schema from this directory:

```bash
createdb corpflow
npm install
cp .env.example .env
npm run seed
```

### Run the API

```bash
npm start
```

The default port is `3000`. The root endpoint does not require authentication and reports the service status. Protected endpoints require the context headers shown below.

## API endpoints

| Method | Endpoint | Required context | Visibility |
|---|---|---|---|
| GET | `/` | None | API status and security contract |
| GET | `/users` | `x-tenant-id`, `x-user-id` | Tenant-wide for admin; project team for manager; self for user |
| GET | `/users/:id` | `x-tenant-id`, `x-user-id` | Same role-aware rules as `/users` |
| GET | `/projects` | `x-tenant-id`, `x-user-id` | All tenant projects for admin; assigned projects for manager/user |
| GET | `/projects/:id` | `x-tenant-id`, `x-user-id` | Same tenant and assignment rules as `/projects` |

Example requests using the seeded data:

```bash
# Pouch.io admin: receives salary and project budget
curl -H 'x-tenant-id: 1' -H 'x-user-id: 1' http://localhost:3000/users

# Pouch.io manager: receives team users without salary
curl -H 'x-tenant-id: 1' -H 'x-user-id: 2' http://localhost:3000/users

# Velocity user: receives only their own profile and assigned projects
curl -H 'x-tenant-id: 2' -H 'x-user-id: 4' http://localhost:3000/projects
```

## Verification

The test suite runs without a live database by mocking the database boundary while exercising the actual Express routes and serializers:

```bash
npm install
npm test
```

The tests cover missing context, cross-tenant authentication, admin tenant scoping, manager team visibility, user self/assignment visibility, sensitive-field removal, and the presence of explicit tenant predicates in protected SQL.

## Live Deployment

A production deployment should provide `DATABASE_URL`, `NODE_ENV=production`, and `PORT` through the hosting provider’s secret/environment settings. The service starts with `npm install` followed by `npm start`. Replace the placeholder below with the URL of the deployed service before submitting the pull request:

`Live deployment: https://3000-ibx5a9e5z1oktsobte8ur-0ba21c93.sg1.manus.computer/` (temporary sandbox deployment; protected endpoints require the documented headers)

## Security documentation

- [Pre-refactor audit](./AUDIT.md)
- [Security design and residual-risk record](./SECURITY.md)

**Status:** Tenant-isolated challenge implementation
**License:** Private Internal Use Only
