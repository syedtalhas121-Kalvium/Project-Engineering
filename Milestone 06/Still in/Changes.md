# Still In? — Expiry Handling Investigation and Fixes

## Investigation before the fixes

I ran the application locally, created a test account, logged in, cast a vote, attempted a second vote, and exercised the authenticated endpoint after the JWT had expired. For a fast repeatable baseline check, the server was started with the normal one-minute expiry behavior reduced to one second; this preserves the same `jsonwebtoken` expiry path while avoiding an unnecessary wait during development.

| Checkpoint | Observation before the fix | Evidence in the code or runtime |
| --- | --- | --- |
| CP1 — Expired-token response | An expired JWT caused `POST /api/vote` to return **500 Internal Server Error** with `{"message":"Invalid token","error":"jwt expired"}`. | `server/middleware/auth.js` caught every verification error and responded with `res.status(500)`. |
| CP2 — Duplicate vote prevention | The same authenticated user could successfully vote twice, including for two different options. | `votedUserIds` stored numeric `req.user.id` values, but the lookup compared each numeric value with the string `req.user.email`; the comparison could never match. |
| CP3 — Global authentication handling | The shared Axios client added the token to requests but had no response interceptor for `401 Unauthorized`. | `client/src/api/client.js` contained only a request interceptor, so authentication failures were left to individual components. |
| CP4 — Polling cleanup | The dashboard created a ten-second polling interval and only cleared it during component unmount. A request failure did not stop the interval or clear the authenticated UI state. | `client/src/pages/Dashboard.jsx` logged polling errors and displayed an alert for vote errors, but did not coordinate session cleanup. |
| CP5 — Expected post-fix behavior | The target behavior is one clear authentication failure, cleanup of session state and background work, and a visible return to `/login`. | The assignment requires a Detect → Block → Reflect flow: the backend emits `401`, the Axios interceptor broadcasts the session ending, and the UI clears state, stops polling, and redirects through the protected route. |

## Fixes applied

### 1. Return `401 Unauthorized` for expired JWTs

**Problem.** The authentication middleware treated an expired token as an unexpected server failure and returned `500`. That status incorrectly suggests a backend outage and prevents the frontend from distinguishing an ended session from an infrastructure error.

**Discovery.** The code audit of `server/middleware/auth.js` showed that `jwt.verify()` was wrapped in a catch-all handler that always returned `500`. The baseline request after expiry confirmed the incorrect status and the `jwt expired` error message.

**Fix.** The middleware now checks `err.name === "TokenExpiredError"` and returns `401 Unauthorized` with the message `Session expired. Please log in again.`. Other invalid-token failures return `401` as authentication failures as well, without exposing internal verification details.

### 2. Prevent duplicate votes with a type-safe membership check

**Problem.** A user could vote repeatedly because the application stored numeric user IDs but checked the array against the user’s email string.

**Discovery.** `server/routes/poll.js` pushed `req.user.id` into `votedUserIds` and then searched using `req.user.email`. The baseline test confirmed that both the first and second votes returned `200 OK`.

**Fix.** The duplicate check now uses `votedUserIds.includes(userId)`, so the value being checked has the same numeric type as the stored identifier. A second vote returns `400` and does not increment the poll.

### 3. Add a global Axios response interceptor for authentication failures

**Problem.** There was no shared response handler for `401` responses, so expired sessions could leave stale credentials and stale user state in the browser.

**Discovery.** `client/src/api/client.js` had a request interceptor but no response interceptor. Error handling was duplicated at call sites and did not perform a consistent logout.

**Fix.** The shared Axios client now handles every `401` response by removing `token` and `user` from `localStorage` and dispatching a browser `auth:unauthorized` event. `AuthContext` listens for that event and calls its existing logout routine, which clears React state. The existing protected-route guard then redirects the user to `/login`.

### 4. Stop polling and clear dashboard state when the session ends

**Problem.** The dashboard’s polling interval continued after an authenticated request failed, producing zombie requests and leaving the dashboard visible after access had ended.

**Discovery.** The `setInterval` cleanup only ran on component unmount; the polling error handler merely logged the error. Manual logout also relied on unmount rather than explicitly stopping the interval first.

**Fix.** `Dashboard.jsx` now listens for `auth:unauthorized`, clears the active interval immediately, clears poll data and transient voting state, and lets the auth context remove the user so the protected route navigates to `/login`. Manual logout uses the same interval cleanup path before clearing the session.

## Verification plan

The implementation will be checked with the backend integration flow and a production frontend build. The expected results are: an expired protected request returns `401`, a second vote returns `400`, the user and token are removed from browser storage after a `401`, the interval is cleared, and the protected dashboard route displays the login page.

## References

[1]: https://github.com/auth0/node-jsonwebtoken#errors-after-verifying
