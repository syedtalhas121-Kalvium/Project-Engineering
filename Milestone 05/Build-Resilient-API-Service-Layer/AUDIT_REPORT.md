# DevMarket API Service Layer Audit

## Scope and Method

This audit covers the four assigned page components in `src/pages/`: `ProductsPage.jsx`, `ProductDetailPage.jsx`, `CartPage.jsx`, and `ProfilePage.jsx`. The files were read completely before the refactor, and the counts below distinguish executable code from incidental mentions inside comments.

## Findings Summary

| File | `fetch()` invocations | FakeStore URL occurrences | `auth_token` reads | Main issues |
|---|---:|---:|---:|---|
| `ProductsPage.jsx` | 3 | 4 | 1 | A module-level base URL plus three raw requests; mixed promise handling; manual authorization header; local error handling. |
| `ProductDetailPage.jsx` | 4 | 4 | 2 | Nested product/category requests; raw cart and review mutations; manual token reads; `alert()`-based failures. |
| `CartPage.jsx` | 3 | 3 | 1 | Nested product-detail requests; no `response.ok` check for the initial request; manual token/header management; direct alert-based errors. |
| `ProfilePage.jsx` | 2 | 2 | 1 | Manual profile fetch and update; duplicated 401 handling; manually assembled authorization header. |
| **Total** | **12** | **13** | **5** | **Four page components own transport, authentication, and response-error concerns.** |

The raw `grep` count for the text `fetch(` is 13 because one occurrence is a comment describing the anti-pattern. The executable count is **12**. The URL count is **13** because `ProductsPage.jsx` contains one module-level `BASE_URL` declaration in addition to the 12 URL-bearing request expressions.

## Request Inventory

| Page | Endpoint patterns observed | Request purpose |
|---|---|---|
| Products | `/products`, `/products/categories`, `/carts` | Load products, load categories, and add an item to the cart. |
| Product detail | `/products/:id`, `/products/category/:category`, `/carts`, `/users` | Load a product, load related products, add to cart, and submit a review. |
| Cart | `/carts/user/1`, `/products/:productId`, `/carts/:cartId` | Load the current user's carts, hydrate cart products, and remove a cart. |
| Profile | `/users/1` with `GET` and `PUT` | Load and update the profile. |

## Architectural Problems

The API base URL is repeated throughout the page layer, and one page additionally declares its own `BASE_URL` constant. A backend URL change therefore requires searching across multiple components instead of changing one configuration value. This creates a preventable risk of partially migrated endpoints and environment drift.

Authentication is also a component concern. Five separate `localStorage.getItem('auth_token')` reads are used to assemble request headers manually. This duplicates security-sensitive code, makes it easy for one request to omit the token, and prevents the application from having one consistent request policy.

The request styles are inconsistent. The codebase mixes promise chains, `async`/`await`, nested requests, and `Promise.all`. Several paths parse JSON without checking the HTTP status first, while other paths implement local status checks. This makes failures difficult to reason about and produces different user-facing behavior for the same class of server error.

Error handling is fragmented. Some components set an error state, some log to the console, and some call `alert()`. Profile and cart logic contain manual 401 checks, even though authentication failures should be handled centrally. There is no shared response policy for 401, 500, or network failures.

Finally, page components are responsible for both UI state and transport mechanics. The resulting duplication obscures the actual page behavior and makes future changes expensive. A centralized axios service should own the base URL, authentication header, response status normalization, and named endpoint functions, leaving pages responsible only for UI state and presentation.

## Refactor Acceptance Criteria

The refactor is complete when all API requests are routed through `src/services/api.js`, no assigned page directly calls `fetch()`, no assigned page reads `localStorage`, no assigned page contains the FakeStore base URL, and the route structure and rendered UI remain unchanged. The service must use `VITE_API_BASE_URL`, attach an existing token through a request interceptor, and expose named functions for the endpoints used by the pages.
