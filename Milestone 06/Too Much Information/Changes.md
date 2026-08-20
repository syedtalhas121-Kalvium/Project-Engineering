# CorpAuth Auth Response Audit

## Scope

This document is the pre-refactor contract for the three authentication endpoints in `routes/auth.js`. The current implementation uses `RETURNING *` and `SELECT *`, so the response payloads are derived from the entire `users` database row rather than from an explicitly approved public shape.

## Move 1 — Pre-Refactor Audit

### `POST /auth/signup`

The route returns the complete row produced by `INSERT ... RETURNING *`. The response should keep only the fields needed to identify the newly created account and initialize the client session.

| Field exposed before refactor | Decision | Security or privacy risk |
| --- | --- | --- |
| `password_hash` | Remove | A password hash is credential material. If leaked, it enables offline password-cracking attempts and exposes implementation details about password storage. |
| `is_admin` | Remove | A backend privilege flag should not be trusted by the client and reveals authorization metadata that belongs on the server. |
| `stripe_customer_id` | Remove | This is a billing-system identifier and exposes an internal customer reference that the frontend does not need for registration. |
| `verification_token` | Remove | Verification tokens are bearer secrets. Returning one to the browser increases the impact of logs, browser extensions, screenshots, and error-tracker leaks. |
| `reset_password_token` | Remove | A password-reset token is a bearer secret and must never be included in a normal account response. |
| `last_login_ip` | Remove | An IP address is sensitive operational and personal data that is not required to complete signup. |
| `subscription_plan` | Remove from the minimum auth shape | Subscription information is product context rather than identity data; it is not needed to complete registration in this repository. |
| `feature_flags` | Remove | Internal rollout and capability information reveals server-side product configuration and can expose functionality that the server must enforce independently. |
| `salary` | Remove | Salary is highly sensitive personal and compensation data with no role in authentication. |
| `updated_at` | Remove from the minimum auth shape | Internal record-maintenance metadata is not required to initialize the frontend session. |

The approved signup user shape retains `id`, `name`, `email`, `role`, and `created_at` (serialized as `createdAt`). These fields identify the account and provide the minimum public information needed by the client.

### `POST /auth/login`

The route returns the complete row selected by `SELECT *`. It must return the same approved public identity shape as signup and must never return the database credential or internal metadata.

| Field exposed before refactor | Decision | Security or privacy risk |
| --- | --- | --- |
| `password_hash` | Remove | Credential material can be copied, logged, or attacked offline if exposed to the client. |
| `is_admin` | Remove | The client must not receive or rely on a raw privilege flag; authorization must remain server-controlled. |
| `stripe_customer_id` | Remove | Internal billing identifiers are unrelated to authentication and are useful reconnaissance for attackers. |
| `verification_token` | Remove | A verification token is a bearer secret and should remain server-side. |
| `reset_password_token` | Remove | A reset token is a bearer secret and must not travel in a login response. |
| `last_login_ip` | Remove | Login-history and network metadata is private operational data. |
| `subscription_plan` | Remove from `toAuthUser` | The minimum authentication response needs identity and role, not billing or entitlement metadata. |
| `feature_flags` | Remove | Feature flags reveal internal configuration and are not an authorization boundary. |
| `salary` | Remove | Compensation data is private and irrelevant to login. |
| `updated_at` | Remove from the minimum auth shape | Record-maintenance metadata is not needed by the auth client. |

The login JWT currently contains `userId`, `email`, `role`, `isAdmin`, `stripeCustomerId`, `subscriptionPlan`, and `featureFlags`. The refactor keeps exactly `userId` and `role`: `userId` identifies the authenticated subject for middleware, and `role` supports server-side role checks. `email`, `subscriptionPlan`, and `featureFlags` are convenient context rather than required authentication claims. `isAdmin` duplicates authorization state and can create an unsafe client-side trust boundary. `stripeCustomerId` is billing data and must not be readable from a token. JWTs are signed but not encrypted, so all claims are readable by anyone holding the token.

### `GET /auth/me`

The route returns the complete row selected by `SELECT *`. The profile response may contain slightly more non-sensitive context than signup and login, but it must still exclude all credentials, bearer tokens, billing identifiers, authorization internals, network metadata, feature flags, and compensation data.

| Field exposed before refactor | Decision | Security or privacy risk |
| --- | --- | --- |
| `password_hash` | Remove | Credential material is never required in a profile response. |
| `is_admin` | Remove | Raw authorization flags belong to server-side policy checks, not client-visible profile data. |
| `stripe_customer_id` | Remove | Billing-system identifiers are internal and unrelated to displaying a profile. |
| `verification_token` | Remove | Verification tokens are bearer secrets. |
| `reset_password_token` | Remove | Reset tokens are bearer secrets. |
| `last_login_ip` | Remove | Network and login-history data is sensitive operational information. |
| `feature_flags` | Remove | Internal feature configuration is not profile data and must not be treated as authorization. |
| `salary` | Remove | Compensation information is highly sensitive personal data. |
| `updated_at` | Remove | Internal record metadata is not needed by the profile client. |

The profile mapper keeps `id`, `name`, `email`, `role`, `created_at` (as `createdAt`), and `subscription_plan` (as `subscriptionPlan`) as non-sensitive account context. The subscription tier is included only on `/auth/me`, where a profile/session refresh may use it for product presentation; billing identifiers and authorization decisions remain backend-only.

## Approved Response Contract After Refactor

| Endpoint | Approved public fields |
| --- | --- |
| `POST /auth/signup` | `user.id`, `user.name`, `user.email`, `user.role`, `user.createdAt` |
| `POST /auth/login` | `token` plus `user.id`, `user.name`, `user.email`, `user.role`, `user.createdAt` |
| `GET /auth/me` | `user.id`, `user.name`, `user.email`, `user.role`, `user.createdAt`, `user.subscriptionPlan` |

No authentication endpoint may return a raw database row. Every returned user object must be produced by an explicit response mapper.

## Post-Refactor Verification Notes

The application must preserve validation, credential verification, JWT validity, and profile lookup behavior. Verification will confirm that the approved fields remain present, all audited fields are absent from signup, login, and profile bodies, and JWT decoding reveals only the `userId` and `role` claims (apart from standard registered claims added by the JWT library).
