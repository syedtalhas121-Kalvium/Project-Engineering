# Dormly — Dorm Marketplace MVP

Dormly is a small, browser-based campus marketplace prototype for listing used items and coordinating in-person handoffs. It intentionally uses local storage rather than a database so the product decision and state behavior remain easy to inspect in a Day 1 prototype.

## Run locally

From this directory, run:

```bash
npm test
npx --yes vite --host 0.0.0.0
```

Then open the local URL printed by Vite. The app has no payment gateway, shipping flow, or external API dependency.

## MVP behavior

The core listing state machine is implemented in `src-domain.js` and exercised by `tests/domain.test.js`.

| State | Meaning | Allowed transitions |
| --- | --- | --- |
| Available | Anyone can see and claim the item. | Claim → Reserved; seller Mark sold → Sold; seller Remove → removed |
| Reserved | One buyer holds the item for 60 seconds. | Seller Confirm handoff → Sold; timer expiry → Available; seller Mark sold → Sold |
| Sold | The listing is closed. | No further claims or edits |

The UI makes each transition visible. A claim requires a buyer name and shows the reservation owner plus a live countdown. The `Advance clock 60s` control is a demo-only shortcut for the ghost buyer scenario; in normal use, the same release occurs automatically when the countdown passes zero. Seller-owned listings expose `Confirm handoff`, `Mark sold`, and `Remove` controls.

## Engineering decisions

The product is deliberately narrow: a claim is a temporary reservation, not a payment or shipping order. The pure functions in `src-domain.js` clone and evaluate the current state before committing a transition. That means a second claim evaluated against the state already committed by the first claim gets the explicit `Item is no longer available` result instead of overwriting the winner.

The full product plan, scope cuts, core features, and Given/When/Then criteria are in [`PRD.md`](./PRD.md).
