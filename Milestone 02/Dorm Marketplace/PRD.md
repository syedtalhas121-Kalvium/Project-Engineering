# Dorm Marketplace — Product Requirements Document

## 1. Scope Cut

1. **Payments:** Payment processing is out of scope because the Day 1 prototype only needs to display a price and coordinate an in-person handoff.
2. **Live chat:** Live chat is out of scope because a structured claim and pickup confirmation flow is enough to validate the marketplace loop.
3. **Delivery tracking:** Delivery tracking is out of scope because every exchange is a campus handoff rather than a shipped order.

## 2. MVP Features

1. **Create and browse listings:** A student can add an item with a title, category, condition, price, and pickup location, then view available listings in the marketplace.
2. **Claim and confirm handoff:** A buyer can claim an available item, and the seller can confirm the in-person handoff to complete the transaction.
3. **Protected listing state:** The app prevents duplicate claims, expires abandoned claims after a short reservation window, and gives sellers immediate Mark as Sold and Remove controls.

## 3. Acceptance Criteria

### Claim Item — successful reservation

**Given** an item is listed as Available  
**When** a student submits a valid buyer name and selects Claim Item  
**Then** the item changes to Reserved, the reservation owner and expiry countdown are visible, and the listing cannot be claimed by another student.

### Claim Item — concurrency collision

**Given** one item is Available and two students attempt to claim it at the same time  
**When** both claim requests are evaluated against the same current item state  
**Then** exactly one request succeeds and the other receives an Item is no longer available result without overwriting the winning reservation.

### Claim Item — abandoned reservation

**Given** an item is Reserved and its reservation deadline passes without handoff confirmation  
**When** the marketplace evaluates expired reservations  
**Then** the reservation is released, the buyer and expiry data are cleared, and the item becomes Available again.
