# CredApp Password Safety Challenge — Changes

## Investigation: what was stored and why

Before the fix, I created a test account with the password `DemoPass123!` and inspected the MongoDB `users` collection. The `password` field contained the exact value `DemoPass123!`, rather than a one-way password hash. This means anyone who obtained a database export could immediately log in as the user or try the same password against other services.

The root cause was in `backend/controllers/authController.js`:

```js
const user = await User.create({
  email,
  password, // plaintext persisted directly
})
```

Login repeated the same unsafe assumption with `user.password !== password`. The Mongoose schema also had no `select: false` protection, so password values could be returned by ordinary queries.

## Fix implemented

- Added `bcrypt` as a runtime dependency.
- Signup now runs `await bcrypt.hash(password, SALT_ROUNDS)` before `User.create`. The submitted plaintext is never persisted.
- Login now loads the hash explicitly with `.select('+password')` and verifies credentials with `await bcrypt.compare(password, user.password)`.
- The schema marks `password` as `select: false`, preventing accidental exposure in normal queries. Login is the only flow that explicitly selects it.
- The API continues to return the same JWT response shape, and the profile endpoint excludes the password field.
- Added `npm run test:password-security`, which checks the source safeguards and executes bcrypt against both correct and incorrect credentials without requiring a live MongoDB instance.

## Why this stops common credential attacks

A database leak should expose only slow, salted bcrypt hashes. An attacker can still attempt an offline dictionary or brute-force attack, but each guess must pass through bcrypt's deliberately expensive work factor. Unique salts prevent one precomputed hash table from matching many accounts, and the original plaintext cannot be recovered directly from the stored value. Password reuse remains a user risk, so users should use unique passwords and the application should add rate limiting and MFA as further defenses.

## Verification

From this directory:

```bash
npm install
npm run test:password-security
```

The check demonstrates that the stored value has the bcrypt `$2b$12$...` shape, is different from the submitted password, accepts the correct password, rejects a wrong password, and confirms the source uses `bcrypt.hash` and `bcrypt.compare` rather than direct plaintext storage/comparison.

Evidence screenshots are included in `docs/evidence/`:

- `password-before.png` — the observed insecure plaintext record and root cause.
- `password-after.png` — the post-fix bcrypt-shaped record and passing verification output.
