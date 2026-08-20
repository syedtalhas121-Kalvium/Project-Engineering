# TxnTracker Performance Optimization Report

## Baseline Observations

The baseline was captured from the unvirtualized starter implementation before any optimization code was applied. The page created one DOM row for every transaction, so the list contained **2,000 transaction rows** on initial load. Scrolling required the browser to traverse the full rendered list, and typing the one-character query `a` caused the visible transaction set to be recalculated while the entire mapped list was reconciled. The React Profiler mount commit measured **1,417.4000 ms** in the captured headless session. The baseline evidence is committed in [`screenshots/baseline-profiler.png`](screenshots/baseline-profiler.png).

## Root Cause Analysis

The original list used `transactions.map(...)`, so the list rendered **2,000 `TransactionRow` elements** at once. During the recorded `a` search interaction, the filtered result contained **1,433 unique transaction rows**, and all of those rows were re-rendered because `TransactionRow` was not memoized and the parent passed a new inline `onSelect` function on each render. The list therefore kept thousands of DOM nodes even though only a small viewport region was visible. The filter calculation also ran on every parent render because it was not cached.

The baseline DOM measurement is the count of elements carrying `data-transaction-row` after the page mounted: **2,000**. The baseline row-render counter uses unique transaction IDs, which avoids double-counting development-mode render passes. The interaction-time React Profiler callback returned **0.0000 ms** at the precision available in this headless capture; the stronger corroborating evidence is the measured row count and the mount commit. This value is reported as captured rather than replaced with an estimate.

## Optimisation Plan

The implementation was applied in the required order. First, `react-window` virtualizes the scroll viewport so that only visible rows are mounted. Second, `React.memo` prevents a row from rendering when its transaction and callback props are unchanged. Third, `useCallback` stabilizes the row-selection handler so memoization can actually skip unchanged rows. Fourth, `useMemo` caches the transaction filtering calculation until either the source transaction array or the search query changes. Virtualization alone is not sufficient because it reduces DOM size but does not prevent the currently mounted rows from re-rendering when their parent changes.

## Implementation Notes

**Virtualization.** `TransactionList.jsx` now uses `FixedSizeList` from `react-window` with `itemCount={transactions.length}`, `itemSize={88}`, and a visible list height of `640px`. The full transaction object is passed through `itemData`, and each virtual row preserves the existing click behavior and visual layout. The optimized capture mounted **10** row elements for the same query instead of 1,433 filtered rows or 2,000 baseline rows.

**React.memo.** `TransactionRow` is exported as `React.memo(TransactionRow)`. Because transaction objects are stable references from the seeded array and the selection callback is stable, unchanged visible rows can skip reconciliation when the search state changes.

**useCallback.** `Transactions.jsx` now defines `handleSelect` with `useCallback([])`. The parent no longer creates a new function reference on every render, allowing `React.memo` to compare the callback prop successfully.

**useMemo.** `useTransactions.js` wraps the name/category filter in `useMemo` with `[transactions, filter]` dependencies and normalizes the query once per calculation. Parent renders that do not change either dependency no longer repeat the 2,000-record filter operation.

## Results Table

| Metric | Before | After | Improvement |
|:--|--:|--:|--:|
| Initial React Profiler mount commit | 1,417.4000 ms | 43.2000 ms | 96.95% lower |
| Search interaction callback duration | 0.0000 ms | 0.0000 ms | Not meaningful at captured precision; report retained as recorded |
| Unique row components rendered for the recorded search | 1,433 | 10 | 99.30% fewer |
| DOM transaction rows in the list | 2,000 | 10 | 99.50% fewer |

The after evidence is committed in [`screenshots/after-profiler.png`](screenshots/after-profiler.png). Both captures were generated from the same one-character query through the app’s React state path, and the row and DOM counts were measured from the rendered application rather than estimated from the dataset size.

## Reflection

Virtualization produced the largest practical improvement because the browser no longer creates or reconciles thousands of elements outside the viewport. Memoization and stable callbacks then protect the small visible window from unnecessary child renders, while `useMemo` removes repeated filtering work during unrelated parent updates. I would not use virtualization for a short list where native semantics, browser find-in-page, or simple accessibility tooling are more valuable than reduced DOM size. I would not use `React.memo` for a cheap component whose props change on every render, because comparison overhead would outweigh the benefit. I would not use `useCallback` merely as a blanket rule when the callback is not passed to memoized children. I would not use `useMemo` for trivial calculations where dependency management and retained references add more complexity than the calculation itself.

## Verification

The optimized project installs successfully with `npm install`, builds successfully with `npm run build`, preserves search filtering, keeps row selection wired to the details panel, and retains all 2,000 source transactions while rendering only the visible window. The baseline screenshot is present before the optimization commit in Git history, and the after screenshot is present in the same `screenshots/` directory.
