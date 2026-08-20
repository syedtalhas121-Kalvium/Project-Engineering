# VaultApp Authentication Bug Analysis

## Scope

This document records the required baseline observations and root-cause analysis before the authentication implementation was changed.

## Observed Behaviours

The original app was opened in a clean browser session with no authentication data in local storage.

| Flow | Observed behaviour before the fix | Expected behaviour |
| --- | --- | --- |
| Navigate directly to `/dashboard` | The Dashboard component rendered immediately. The navbar showed Dashboard, Settings, and Login, even though no user was authenticated. | Redirect to `/login` without rendering protected content. |
| Navigate directly to `/settings` | The Settings component rendered immediately, including security preferences and the Danger Zone. | Redirect to `/login` without rendering protected content. |
| Navigate directly to `/profile` | The Profile component rendered immediately without authentication. | Redirect to `/login` without rendering protected content. |
| Log in, then refresh | The login page could call `login()` only when the provider was wired, but the original context did not write the token or user to local storage and had no mount-time restore. A refresh therefore lost the in-memory session. | The authenticated session remains available after refresh. |
| Click Logout | The original navbar had no logout action. It always rendered a Login link, so it did not reflect authentication state. | Clear the session, show Login, and navigate to `/login`. |

## Root Cause Analysis — Bug 1: Context Provider Wiring

`src/main.jsx` imported neither an active `AuthProvider` nor a provider wrapper. The application rendered `BrowserRouter` and `App` directly. As a result, components using `useAuth()` could not receive the shared authentication context. The provider must wrap the router and the entire application tree.

## Root Cause Analysis — Bug 2: Token Persistence

`src/context/AuthContext.jsx` stored `user` and `token` only in React state. `login()` did not write `authToken` or `authUser` to `localStorage`, `logout()` did not remove them, and there was no `useEffect` to restore them when the provider mounted. React state resets on a full page reload, so the session could not persist.

## Root Cause Analysis — Bug 3: Protected Routes

`src/App.jsx` rendered `/dashboard`, `/settings`, and `/profile` directly. No route-level authentication guard checked `isAuthenticated`, so a user could bypass the login page by entering a private URL directly. A `ProtectedRoute` wrapper must redirect unauthenticated users to `/login` with `replace` and render children only for authenticated users.

## Root Cause Analysis — Bug 4: Auth-Aware Navbar

`src/components/Navbar.jsx` ignored the authentication context, hardcoded links to private pages, and always displayed Login. It did not display the authenticated user's name, did not provide Logout, and could not navigate to `/login` after logout. The navbar must consume `user`, `isAuthenticated`, and `logout()` from the auth context.

## Fixes Applied

The fixes are recorded here as they are implemented and verified:

1. The app entrypoint wraps the router and application with `AuthProvider`.
2. The auth provider restores sessions from local storage, persists successful logins, and clears storage on logout.
3. `ProtectedRoute` guards every private route and redirects unauthenticated users to `/login`.
4. The navbar renders authentication-aware navigation and a logout action.

## Verification Evidence

The final five-flow verification screenshots are stored in `screenshots/` and are referenced in the pull request description.

### Verified after the fix

The fixed app was opened with local storage cleared. Visiting `/dashboard` redirected immediately to `/login`, and the dashboard content was not rendered. The same `ProtectedRoute` guard is applied to `/settings` and `/profile`.

The fixed app was logged into with `demo@vault.app` / `password123`, then refreshed at `/dashboard`. The dashboard remained visible, the navbar still showed `Hi, Demo User`, and Logout remained available, confirming local-storage restoration.

Logout verification passed: clicking Logout cleared the session, navigated to `/login`, and changed the navbar to show only Login. Visiting `/dashboard` directly after logout redirected to `/login` again, confirming the guard remains effective after the session is cleared.
