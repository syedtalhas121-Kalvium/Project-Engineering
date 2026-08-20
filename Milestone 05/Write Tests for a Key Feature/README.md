# FormFlow Test Suite

This challenge adds a behavior-focused Jest and React Testing Library suite to FormFlow. The tests exercise the reusable `Button` and `ErrorMessage` components plus the `LoginForm` and `OrdersList` user flows. API modules are mocked so the suite remains deterministic and never depends on a running backend.

## Verification

Run the complete suite with:

```bash
npm test
```

Run the suite with coverage using:

```bash
npm run test:coverage
```

The final verification contains **14 passing tests across 4 test files**. The suite covers accessible rendering, user interaction, disabled and loading states, successful and rejected authentication requests, empty credentials, order rendering, empty order history, and order-loading failures.

| Evidence | Description |
| --- | --- |
| `screenshots/tests-passing.png` | Passing Jest output with four test files and 14 passing tests |
| `screenshots/test-coverage.png` | Coverage table and passing summary |

## Test organization

The test files are grouped by feature and component:

- `src/components/__tests__/Button.test.jsx`
- `src/components/__tests__/ErrorMessage.test.jsx`
- `src/features/__tests__/LoginForm.test.jsx`
- `src/features/__tests__/OrdersList.test.jsx`

Queries use accessible roles, labels, and visible text rather than CSS selectors or implementation-specific test IDs. Each suite uses `describe` blocks for happy paths, failure cases, and edge cases where applicable.

## Local development

Install dependencies with `npm install`, start the Vite app with `npm run dev`, and run the tests with `npm test`. The application uses the existing mock API endpoints for login and order data; the test suite replaces those API calls with controlled Jest responses.

