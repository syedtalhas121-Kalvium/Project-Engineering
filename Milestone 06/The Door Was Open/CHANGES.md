# Security Audit: The Door Was Open

## Investigation

The audit was performed against the starter server before any route changes. Requests were sent without an `Authorization` header. The expected behavior for private routes was `401 Unauthorized`; the public authentication and health routes were expected to remain available.

| Route | Method | Before-fix response without a token | Should be blocked? | Finding |
| --- | --- | --- | --- | --- |
| `/api/auth/register` | POST | `201 Created` with a registered-user response | No | Intentionally public and working. |
| `/api/auth/login` | POST | `200 OK` with a JWT | No | Intentionally public and working. |
| `/api/health` | GET | `200 OK` with `{ status: "healthy" }` | No | Intentionally public for monitoring. |
| `/api/users/profile` | GET | `200 OK` with profile data | Yes | Private user data was exposed. |
| `/api/users/profile` | PUT | `400 Bad Request` from the handler because the first audit request omitted `email` | Yes | The business handler ran without authentication; it should have returned `401` before validation. |
| `/api/posts/my-posts` | GET | `200 OK` with private post content | Yes | Private post data was exposed. |
| `/api/posts/create` | POST | `201 Created` with a new post | Yes | A state-changing operation ran without authentication. |
| `/api/admin/users` | GET | `200 OK` with user records | Yes | Administrative user data was exposed. |
| `/api/admin/users/:id` | DELETE | `200 OK` confirming deletion | Yes | A destructive administrative operation ran without authentication. |

The audit established that all six routes in `userRoutes.js`, `postRoutes.js`, and `adminRoutes.js` were reachable without a token. The `PUT` route returned a validation error only because the request body was incomplete; that response still proved the request had entered controller logic rather than being rejected by authentication middleware.

## Fix

The following files were modified:

| File | Routes protected |
| --- | --- |
| `routes/userRoutes.js` | `GET /profile`, `PUT /profile` |
| `routes/postRoutes.js` | `GET /my-posts`, `POST /create` |
| `routes/adminRoutes.js` | `GET /users`, `DELETE /users/:id` |
| `package.json` | Added the repeatable `test:security` command. |
| `scripts/verify-security.sh` | Added automated checks for private, public, and valid-token requests. |

Each private route now imports the existing middleware and places `authenticate` immediately after the path and before the controller handler:

```js
router.get('/profile', authenticate, controller);
```

This explicit route-level placement matters because authentication must run at the request entry point. If the token is absent or invalid, the middleware returns `401` and does not call `next()`, so the business handler cannot read or mutate protected data. The public routes in `authRoutes.js` were intentionally left unchanged. `middleware/authenticate.js` was not modified.

## Verification

After restarting the server, the complete unauthenticated private-route audit returned the expected response for every protected endpoint:

| Route | Method | After-fix response without a token |
| --- | --- | --- |
| `/api/users/profile` | GET | `401` with `Authentication required. No token provided.` |
| `/api/users/profile` | PUT | `401` with `Authentication required. No token provided.` |
| `/api/posts/my-posts` | GET | `401` with `Authentication required. No token provided.` |
| `/api/posts/create` | POST | `401` with `Authentication required. No token provided.` |
| `/api/admin/users` | GET | `401` with `Authentication required. No token provided.` |
| `/api/admin/users/:id` | DELETE | `401` with `Authentication required. No token provided.` |

Public-route checks also passed: `GET /api/health` returned `200`, `POST /api/auth/register` returned `201`, and `POST /api/auth/login` returned `200` with a token. Using the token returned by login, `GET /api/users/profile`, `GET /api/posts/my-posts`, and `GET /api/admin/users` each continued to return `200`.

The automated verification command is:

```bash
JWT_SECRET=challenge-demo-secret npm run test:security
```

It passed all eleven checks: six private routes rejected without a token, two public routes remained available, the health endpoint remained available, and three representative private routes succeeded with a valid JWT. The same before/after evidence is demonstrated in the submission video.
