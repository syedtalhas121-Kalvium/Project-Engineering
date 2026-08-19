# SplitCart Logic Lab: Acceptance Criteria

## Investigation Summary

SplitCart is intended to help roommates add items to a shared cart, divide the bill, and confirm individual payments. The prototype was reviewed through its Express API and React interface. The investigation found several gaps where the original behavior was not sufficiently constrained by product rules.

## Logical Issues and Missing Guardrails

| ID | Issue observed | Why it occurs | Why it is problematic |
| --- | --- | --- | --- |
| LI-01 | The prototype accepted an item with an empty name and a negative price. | The item endpoint converted any value with `parseFloat` and defaulted invalid values to zero; the form submitted without validation. | Invalid items can reduce the bill total, confuse participants, and make the shared expense impossible to audit. |
| LI-02 | A participant could add an item after another participant had confirmed payment. | The item endpoint did not check whether payment had started. | The cart total could change after shares were calculated, causing participants to pay inconsistent amounts. |
| LI-03 | A participant could confirm an arbitrary payment amount. | The payment endpoint recorded the submitted amount without comparing it to the calculated share. | A participant could underpay or overpay while the interface still treated the payment as valid. |
| LI-04 | Any participant could delete any item, and deleting an unknown item returned success. | The delete endpoint filtered by ID without checking the original owner or whether the item existed. | A roommate could remove someone else's purchase, and a successful response could falsely suggest that a deletion occurred. |
| LI-05 | The UI optimistically inserted two temporary copies of every newly added item. | The React add handler appended a temporary item and a second copy before synchronizing with the server. | Users saw duplicate groceries and temporarily incorrect totals, undermining trust in the shared cart. |
| LI-06 | The split calculation used floating-point arithmetic and did not define how to distribute cents. | The original server divided a decimal total directly by the participant count. | Values such as $13.25 divided among three people require a deterministic remainder rule; otherwise the collected amount may not equal the cart total. |

## Acceptance Criteria 1: Adding and Removing Cart Items

### AC-1.1 — Valid item creation

**Given** the cart has not entered payment confirmation, the current user is a member of the group, and the item has a non-empty name and a price greater than $0.00,

**When** the user submits the item,

**Then** the system must create exactly one item, associate it with that user, return the normalized price rounded to the nearest cent, and update the cart total for every subsequent cart read.

### AC-1.2 — Invalid item rejection

**Given** the cart is open,

**When** a user submits an item with a blank name, a non-numeric price, or a price less than or equal to $0.00,

**Then** the system must reject the request with an error explaining the invalid field and must not change the cart contents or total.

### AC-1.3 — Ownership-limited deletion

**Given** the cart is open and an item was added by a different group member,

**When** the current user attempts to delete that item,

**Then** the system must reject the request with the message `You can only remove items you added` and must leave the item and total unchanged.

### AC-1.4 — Missing-item deletion

**Given** the cart is open and no item exists with the requested identifier,

**When** a user attempts to delete it,

**Then** the system must return a not-found error rather than a success response.

### AC-1.5 — Cart lock after payment begins

**Given** at least one participant has confirmed payment,

**When** any user attempts to add or delete an item,

**Then** the system must reject the action with `Cart is locked — payment in progress` and must preserve the cart total and item list.

## Acceptance Criteria 2: Payment Confirmation and Bill Splitting

### AC-2.1 — Exact calculated share

**Given** the cart total is known and no participant has previously confirmed payment,

**When** a participant submits a payment,

**Then** the system must accept the payment only when its amount equals the calculated share in whole cents and must record the participant once.

### AC-2.2 — Deterministic remainder handling

**Given** the cart total does not divide evenly among all participants,

**When** the system calculates the shares,

**Then** each early confirmer must pay the floor share in cents and the last confirmer must pay the remaining amount so that total payments equal the cart total exactly.

### AC-2.3 — Invalid payment rejection

**Given** a participant submits a payment that is not the calculated share, is not positive, or belongs to a participant outside the group,

**When** the payment request is processed,

**Then** the system must reject it with an explanatory error and must not record the payment.

### AC-2.4 — Complete settlement

**Given** every participant has confirmed exactly one valid share,

**When** the final payment is recorded,

**Then** the system must report that settlement is complete only when the total collected equals the cart total to the cent.

## Implementation Delivered

The prototype now validates item and payment inputs, prevents duplicate payment confirmations, enforces item ownership, returns correct not-found and conflict responses, locks cart mutations when payment begins, uses cent-based calculations, and assigns any remainder to the last confirmer. The React interface now reflects the real participant count, prevents invalid submissions, removes the optimistic duplicate-item behavior, exposes the active user for ownership testing, and displays clear error and lock-state messages.

## Verification Evidence

The updated API was verified with the following scenarios: invalid item submission returned HTTP 400; a valid item returned HTTP 201; deleting another user's item returned HTTP 403; the first valid payment locked the cart; adding after payment returned HTTP 409; an incorrect payment returned HTTP 400; and a $13.25 cart settled successfully as $4.41, $4.41, and $4.43.

> **Conclusion:** The acceptance criteria convert the prototype's ambiguous edge cases into explicit, testable rules that protect the cart total, participant permissions, and payment settlement.
