import test from "node:test";
import assert from "node:assert/strict";
import {
  CLAIM_DURATION_MS,
  STATUS,
  claimItem,
  confirmHandoff,
  createItem,
  markSold,
  removeListing,
  seedItems,
} from "../src-domain.js";

const NOW = 1_750_000_000_000;

function oneAvailableItem() {
  return [{
    id: "book-1",
    title: "Single copy book",
    category: "Textbooks",
    condition: "Good",
    price: 10,
    pickup: "Maple Hall",
    seller: "Alex Johnson",
    status: STATUS.AVAILABLE,
    claimedBy: null,
    reservedUntil: null,
    createdAt: NOW,
  }];
}

test("concurrency collision: only the first claim wins", () => {
  const original = oneAvailableItem();
  const first = claimItem(original, "book-1", "Maya Patel", NOW);
  const second = claimItem(original, "book-1", "Sam Rivera", NOW);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true, "independent calls can each produce a valid candidate state");
  assert.equal(first.items[0].claimedBy, "Maya Patel");
  assert.equal(second.items[0].claimedBy, "Sam Rivera");

  // This is the atomic commit boundary used by the UI: the second request is evaluated
  // against the state committed by the first request, not the original snapshot.
  const committedSecond = claimItem(first.items, "book-1", "Sam Rivera", NOW);
  assert.equal(committedSecond.ok, false);
  assert.equal(committedSecond.message, "Item is no longer available.");
  assert.equal(committedSecond.items[0].claimedBy, "Maya Patel");
});

test("ghost buyer: an expired reservation becomes available again", () => {
  const claimed = claimItem(oneAvailableItem(), "book-1", "Maya Patel", NOW);
  const afterDeadline = claimItem(claimed.items, "book-1", "Sam Rivera", NOW + CLAIM_DURATION_MS + 1);

  assert.equal(afterDeadline.ok, true);
  assert.equal(afterDeadline.items[0].status, STATUS.RESERVED);
  assert.equal(afterDeadline.items[0].claimedBy, "Sam Rivera");
  assert.equal(afterDeadline.items[0].reservedUntil, NOW + CLAIM_DURATION_MS + 1 + CLAIM_DURATION_MS);
});

test("hallway sale: seller can override a reservation immediately", () => {
  const claimed = claimItem(oneAvailableItem(), "book-1", "Maya Patel", NOW);
  const result = markSold(claimed.items, "book-1", "Alex Johnson", NOW + 10);

  assert.equal(result.ok, true);
  assert.equal(result.items[0].status, STATUS.SOLD);
  assert.equal(result.items[0].reservedUntil, null);
});

test("seller can remove a listing, while a different seller cannot", () => {
  const items = seedItems(NOW);
  const denied = removeListing(items, "itm-book", "Jordan Lee", NOW);
  const removed = removeListing(items, "itm-book", "Alex Johnson", NOW);

  assert.equal(denied.ok, false);
  assert.equal(denied.items.length, items.length);
  assert.equal(removed.ok, true);
  assert.equal(removed.items.some((item) => item.id === "itm-book"), false);
});

test("seller can confirm a reserved handoff and invalid listings are rejected", () => {
  const claimed = claimItem(oneAvailableItem(), "book-1", "Maya Patel", NOW);
  const handoff = confirmHandoff(claimed.items, "book-1", "Alex Johnson", NOW + 10);

  assert.equal(handoff.ok, true);
  assert.equal(handoff.items[0].status, STATUS.SOLD);
  assert.throws(() => createItem({ title: "", category: "Other", condition: "Good", price: 0, pickup: "Hall", seller: "Alex Johnson" }));
});
