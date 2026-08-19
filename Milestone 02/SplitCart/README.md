# SplitCart Prototype

SplitCart is a prototype application designed to help roommates split grocery or food delivery expenses.

Users can add items to a shared cart and divide the total bill equally between participants.

---

## Features

The current prototype allows users to:

- Add items to a shared cart
- View the total cart value
- Split the bill among participants
- Confirm payment shares
- Remove items from the cart

---

## Running the Project

Install dependencies:

```bash
npm install
```

Start backend:

```bash
node server/index.js
```

Start frontend:

```bash
npm run dev
```

Frontend runs on:

http://localhost:5173

---

## Engineering Investigation

This prototype was developed quickly during early product development.

The engineering team suspects that the system behavior may not always match the intended product logic.

Your task is to run the application and explore how the cart behaves when multiple participants interact with it.

Pay attention to how:

- cart totals behave
- payments are calculated
- cart items are modified

Document any inconsistencies you observe.

These observations will help define the acceptance criteria that should govern the product.


## Challenge #6 Submission

The completed investigation and Given / When / Then acceptance criteria are available in [`docs/splitcart-acceptance-criteria.md`](./docs/splitcart-acceptance-criteria.md), with the required PDF submission at [`docs/student-splitcart-logic-lab.pdf`](./docs/student-splitcart-logic-lab.pdf).

The repaired prototype now enforces positive item prices, participant ownership for deletion, a cart lock after the first payment, exact cent-based payment validation, and deterministic remainder handling. To run it locally:

```bash
npm run install-all
npm run dev
```

The client runs at `http://localhost:5173` and the API runs at `http://localhost:3001`.
