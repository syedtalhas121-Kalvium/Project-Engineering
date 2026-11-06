# CredApp — Password Safety Challenge

CredApp is a basic authentication API for the **Passwords in Plain Sight** security challenge.

## What the app does

- Create an account with `POST /api/auth/signup` using `{ email, password }`.
- Log in with `POST /api/auth/login` and receive a JWT.
- Access `GET /api/auth/profile` with `Authorization: Bearer <token>`.

## Password-safety result

The starter version stored the submitted password directly in MongoDB and compared it as plaintext. The corrected version hashes passwords with bcrypt during signup and uses `bcrypt.compare` during login. The password field is also excluded from ordinary Mongoose queries and selected explicitly only for credential verification.

See [CHANGES.md](./CHANGES.md) for the observed stored value, root cause, attack explanation, implementation details, and evidence screenshots.

## Setup

1. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI` and `JWT_SECRET`.
2. Run `npm install`.
3. Run `npm start`.
4. The server starts at `http://localhost:3000`.

## Repeatable verification

Run the database-independent security checks with:

```bash
npm run test:password-security
```

The checks prove that bcrypt creates a salted hash, the hash is not equal to the plaintext, the correct password is accepted, the wrong password is rejected, and the source no longer stores or compares plaintext passwords.
