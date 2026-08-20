# JWT Authentication Repair Report

## Vulnerability Audit

The audit was performed before any application-code fix. Each sensitive route was exercised without an `Authorization` header using a disposable HTTP harness with persistence calls replaced by fixtures. This isolated authorization behavior while avoiding a dependency on a local MongoDB service.

| Method | Route | Status before fix | Data returned | Token required? | Finding |
|---|---|---:|---|---|---|
| GET | `/api/tasks` | 500 | No; the controller attempted to read `req.user.id` after the broken middleware called `next()` | No | Invalid or missing authentication reached the handler and caused an undefined-user error. |
| POST | `/api/tasks` | 500 | No; the controller attempted to read `req.user.id` after the broken middleware called `next()` | No | Invalid or missing authentication reached the handler and caused an undefined-user error. |
| GET | `/api/tasks/task-1` | 200 | Yes; the task fixture was returned | No | The route had no authentication middleware. |
| PUT | `/api/tasks/task-1` | 500 | No; the handler reached the update path without a valid authenticated context in the fixture | No | The route relied on the broken middleware, which called `next()` after verification failed. |
| DELETE | `/api/tasks/task-1` | 200 | Yes; a successful deletion response was returned | No | The route had no authentication middleware. |
| GET | `/api/admin/users` | 200 | Yes; the user list was returned | No | The admin route had no authentication or authorization middleware. |
| DELETE | `/api/admin/users/user-1` | 200 | Yes; a successful deletion response was returned | No | The admin route had no authentication or authorization middleware. |

The audit exposed the critical issue: routes that were intended to require authentication either lacked the middleware entirely or used middleware that continued after verification failed. The result was a mix of data disclosure, unauthenticated mutation attempts, and server errors instead of a consistent `401` response.

## Root Cause Analysis

### Checkpoint 1 — Token Generation

`controllers/authController.js:31–35` generated tokens with `{ id: user._id }`, a hardcoded `'mysecretkey'`, and no expiration option. The payload omitted `email` and `role`, the signing secret did not come from `process.env.JWT_SECRET`, and the token could live indefinitely.

### Checkpoint 2 — Middleware Header Extraction

`middleware/authMiddleware.js:5` read `req.headers.token` instead of the standard `Authorization: Bearer <token>` header. The missing-header branch did not return a response, so execution continued into verification with an undefined token.

### Checkpoint 3 — Verification Error Handling

`middleware/authMiddleware.js:17–21` caught all `jwt.verify()` failures and called `next()` inside the `catch` block. This allowed invalid, expired, malformed, or missing tokens to reach protected handlers without a populated `req.user`.

### Checkpoint 4 — Route Protection Coverage

The following sensitive routes were missing `authMiddleware`: `GET /api/tasks/:id`, `DELETE /api/tasks/:id`, `GET /api/admin/users`, and `DELETE /api/admin/users/:id`. The admin routes also lacked a role check, so a valid non-admin token would not be prevented from using admin operations.

### Checkpoint 5 — Error Response Consistency

The middleware did not send a response for missing or invalid credentials and instead continued to the route handler. Depending on the handler, the client received `200`, `201`, or `500`. This was inconsistent with the required contract that authentication failures return `401` with a `{ message: "..." }` response body.

## What I Fixed

### Fix 1 — Correct token generation

Before:

```js
const token = jwt.sign(
    { id: user._id },
    'mysecretkey'
    // no expiry
);
```

After:

```js
const token = jwt.sign(
    {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);
```

This prevents tokens from carrying incomplete identity information, relying on a hardcoded secret, or remaining valid indefinitely.

### Fix 2 — Correct middleware extraction and verification

Before:

```js
const token = req.headers.token;

try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
} catch (err) {
    next();
}
```

After:

```js
const authHeader = req.headers.authorization;
const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
}

try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
} catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
}
```

This prevents missing, malformed, tampered, and expired tokens from reaching protected handlers and gives clients a stable authentication-failure response.

### Fix 3 — Protect every sensitive route and enforce administrator authorization

Before:

```js
router.get('/tasks/:id', getTaskById);
router.delete('/tasks/:id', deleteTask);
router.get('/admin/users', getAllUsers);
router.delete('/admin/users/:id', deleteUser);
```

After:

```js
router.get('/tasks/:id', authMiddleware, getTaskById);
router.delete('/tasks/:id', authMiddleware, deleteTask);
router.get('/admin/users', authMiddleware, requireAdmin, getAllUsers);
router.delete('/admin/users/:id', authMiddleware, requireAdmin, deleteUser);
```

This closes the unauthenticated route gaps and ensures that a valid user token cannot be used to access administrator-only operations. The task controllers were also aligned with the repaired `userId` claim.

## Verification Results

The fixed flow was exercised with a disposable HTTP harness and deterministic fixtures. JavaScript syntax checks passed for every changed source file.

| Scenario | Expected | Actual | Result | Evidence |
|---|---:|---:|---|---|
| No token on `GET /api/tasks` | 401 | 401 `{ "message": "No token provided." }` | Passed | `screenshots/01-no-token.png` |
| Fake token on `GET /api/tasks` | 401 | 401 `{ "message": "Invalid or expired token." }` | Passed | `screenshots/02-fake-token.png` |
| Expired token on `GET /api/tasks` | 401 | 401 `{ "message": "Invalid or expired token." }` | Passed | `screenshots/03-expired-token.png` |
| Valid user token on `GET /api/tasks` | 200 | 200 with task data | Passed | `screenshots/04-valid-token.png` |
| Valid user token on `GET /api/admin/users` | 403 | 403 `{ "message": "Admin access required." }` | Passed | `screenshots/05-wrong-role.png` |
| Valid admin token on `GET /api/admin/users` | 200 | 200 with user data | Passed | `screenshots/06-admin-token.png` |

## What Happens if This Is Not Fixed

If token generation remains broken, an attacker who obtains a token can use it indefinitely because there is no expiry, while route handlers cannot reliably identify the user or enforce role-based permissions because `email` and `role` are absent from the claims. A hardcoded signing secret also makes a secret reused across environments easier to discover and abuse.

If the middleware reads the wrong header and does not reject a missing header, normal clients sending the standard Bearer authorization header are not authenticated. The request then reaches verification with an undefined value and enters the unsafe failure path instead of being stopped at the boundary.

If the verification `catch` block calls `next()`, an attacker does not need a valid JWT. They can send no token, a random string, an expired token, or a tampered token and still reach handlers. Where handlers use `req.user`, this produces server errors; where they do not, it can disclose or mutate data.

If sensitive routes are not consistently mounted with authentication and administrator checks, an attacker can enumerate users, delete users, read individual tasks, or delete tasks directly with unauthenticated HTTP requests. The missing admin role check additionally allows any authenticated account to invoke administrator operations.

## Test Method

The pre-fix audit and post-fix verification used disposable local harnesses with model persistence calls replaced by deterministic fixtures. This was necessary because the provided environment did not include a MongoDB daemon. The application source was exercised through its real Express routers and authentication middleware; no application-code fix was made before the audit results were recorded.
