const express = require('express');
const cors = require('cors');
const cartState = require('./cartState');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const toCents = (value) => Math.round(Number(value) * 100);
const toMoney = (cents) => Number((cents / 100).toFixed(2));
const getTotalCents = () => cartState.items.reduce((sum, item) => sum + toCents(item.price), 0);
const hasStartedPayment = () => cartState.payments.length > 0;

const errorResponse = (res, status, message) => res.status(status).json({ error: message });

// GET /cart - Get the current cart state, total, split, and lock status.
app.get('/cart', (req, res) => {
  const totalCents = getTotalCents();
  const participantCount = cartState.participants.length;
  const baseShareCents = participantCount ? Math.floor(totalCents / participantCount) : 0;
  const remainderCents = participantCount ? totalCents - baseShareCents * participantCount : 0;
  const remainingPayers = participantCount - cartState.payments.length;
  const nextShareCents = remainingPayers === 1
    ? totalCents - cartState.payments.reduce((sum, payment) => sum + payment.amountCents, 0)
    : baseShareCents;

  res.json({
    ...cartState,
    total: toMoney(totalCents),
    share: toMoney(baseShareCents),
    nextShare: toMoney(nextShareCents),
    remainder: toMoney(remainderCents),
    paymentLocked: hasStartedPayment(),
  });
});

// POST /cart/item - Add an item to the cart before payment begins.
app.post('/cart/item', (req, res) => {
  if (hasStartedPayment()) {
    return errorResponse(res, 409, 'Cart is locked — payment in progress');
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const price = Number(req.body.price);
  const addedBy = typeof req.body.addedBy === 'string' ? req.body.addedBy.trim() : '';

  if (!name) return errorResponse(res, 400, 'Item name is required');
  if (!Number.isFinite(price) || price <= 0) {
    return errorResponse(res, 400, 'Item price must be greater than $0.00');
  }
  if (!cartState.participants.includes(addedBy)) {
    return errorResponse(res, 400, 'Item owner must be a group participant');
  }

  const newItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    price: toMoney(toCents(price)),
    addedBy,
  };
  cartState.items.push(newItem);
  return res.status(201).json(newItem);
});

// DELETE /cart/item/:id - Only the original item owner can remove it before payment.
app.delete('/cart/item/:id', (req, res) => {
  if (hasStartedPayment()) {
    return errorResponse(res, 409, 'Cart is locked — payment in progress');
  }

  const currentUser = typeof req.body.currentUser === 'string' ? req.body.currentUser.trim() : '';
  const item = cartState.items.find((candidate) => candidate.id === req.params.id);

  if (!item) return errorResponse(res, 404, 'Item not found');
  if (item.addedBy !== currentUser) {
    return errorResponse(res, 403, 'You can only remove items you added');
  }

  cartState.items = cartState.items.filter((candidate) => candidate.id !== req.params.id);
  return res.json({ message: 'Item removed' });
});

// POST /cart/pay - Confirm the exact calculated share for one participant.
app.post('/cart/pay', (req, res) => {
  const participant = typeof req.body.participant === 'string' ? req.body.participant.trim() : '';
  const amount = Number(req.body.amount);

  if (!cartState.participants.includes(participant)) {
    return errorResponse(res, 400, 'Participant must belong to this group');
  }
  if (cartState.payments.some((payment) => payment.participant === participant)) {
    return errorResponse(res, 409, 'This participant has already confirmed payment');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return errorResponse(res, 400, 'Payment amount must be greater than $0.00');
  }

  const totalCents = getTotalCents();
  const totalPaidBeforeCents = cartState.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const remainingParticipants = cartState.participants.length - cartState.payments.length;
  const expectedCents = remainingParticipants === 1
    ? totalCents - totalPaidBeforeCents
    : Math.floor(totalCents / cartState.participants.length);
  const amountCents = toCents(amount);

  if (amountCents !== expectedCents) {
    return errorResponse(res, 400, `Payment must equal the calculated share of $${toMoney(expectedCents).toFixed(2)}`);
  }

  cartState.payments.push({ participant, amount: toMoney(amountCents), amountCents });
  const totalPaidCents = totalPaidBeforeCents + amountCents;
  const isComplete = cartState.payments.length === cartState.participants.length && totalPaidCents === totalCents;

  return res.json({
    success: true,
    totalPaid: toMoney(totalPaidCents),
    currentTotal: toMoney(totalCents),
    isComplete,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;
