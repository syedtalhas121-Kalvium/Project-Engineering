# VaultApp — Protected Routes & Auth Flow

VaultApp is a React/Vite training application with a corrected authentication flow. The app now centralizes auth state in `AuthContext`, persists sessions in `localStorage`, guards private routes with `ProtectedRoute`, and keeps the navbar synchronized with the current session.

## Live Deployment

The live GitHub Pages deployment is available at:

<https://syedtalhas121-kalvium.github.io/Project-Engineering/>

The deployment is published automatically from `main` by `.github/workflows/deploy-vaultapp.yml`.

## Demo Credentials

Use the following credentials in the demo login form:

| Field | Value |
| --- | --- |
| Email | `demo@vault.app` |
| Password | `password123` |

## Authentication Behavior

Unauthenticated visits to `/dashboard`, `/settings`, and `/profile` redirect to `/login`. Successful login stores both the token and user object in local storage, and the provider restores them after refresh. Logout clears React state and local storage, navigates to `/login`, and causes the navbar to show only Login.

## Evidence and Analysis

The required pre-fix observations and root-cause analysis are documented in [AUTH-BUGS.md](./AUTH-BUGS.md). The five browser verification captures are in [screenshots/](./screenshots/): unauthenticated redirect, login success, refresh persistence, logout redirect, and post-logout redirect.
