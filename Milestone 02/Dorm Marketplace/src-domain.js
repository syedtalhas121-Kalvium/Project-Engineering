export const CLAIM_DURATION_MS = 60 * 1000;

export const STATUS = Object.freeze({
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
});

const clone = (value) => JSON.parse(JSON.stringify(value));

export function seedItems(now = Date.now()) {
  return [
    {
      id: "itm-book",
      title: "Calculus: Early Transcendentals",
      category: "Textbooks",
      condition: "Good",
      price: 18,
      pickup: "Maple Hall lobby",
      seller: "Alex Johnson",
      status: STATUS.AVAILABLE,
      claimedBy: null,
      reservedUntil: null,
      createdAt: now - 1000 * 60 * 42,
    },
    {
      id: "itm-lamp",
      title: "Warm desk lamp",
      category: "Room essentials",
      condition: "Like new",
      price: 0,
      pickup: "Oak House, room 214",
      seller: "Alex Johnson",
      status: STATUS.AVAILABLE,
      claimedBy: null,
      reservedUntil: null,
      createdAt: now - 1000 * 60 * 28,
    },
    {
      id: "itm-keyboard",
      title: "Mechanical keyboard",
      category: "Electronics",
      condition: "Good",
      price: 35,
      pickup: "Cedar Court study room",
      seller: "Jordan Lee",
      status: STATUS.AVAILABLE,
      claimedBy: null,
      reservedUntil: null,
      createdAt: now - 1000 * 60 * 13,
    },
    {
      id: "itm-chair",
      title: "Ergonomic study chair",
      category: "Furniture",
      condition: "Fair",
      price: 25,
      pickup: "Pine Hall entrance",
      seller: "Jordan Lee",
      status: STATUS.AVAILABLE,
      claimedBy: null,
      reservedUntil: null,
      createdAt: now - 1000 * 60 * 7,
    },
  ];
}

export function createItem(input, now = Date.now()) {
  const title = String(input.title ?? "").trim();
  const category = String(input.category ?? "").trim();
  const condition = String(input.condition ?? "").trim();
  const pickup = String(input.pickup ?? "").trim();
  const seller = String(input.seller ?? "").trim();
  const numericPrice = Number(input.price);

  if (!title || !category || !condition || !pickup || !seller) {
    throw new Error("Please complete every listing field.");
  }
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error("Price must be a zero or positive number.");
  }

  return {
    id: `itm-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    category,
    condition,
    price: Math.round(numericPrice),
    pickup,
    seller,
    status: STATUS.AVAILABLE,
    claimedBy: null,
    reservedUntil: null,
    createdAt: now,
  };
}

export function releaseExpiredClaims(items, now = Date.now()) {
  return clone(items).map((item) => {
    if (item.status !== STATUS.RESERVED || !item.reservedUntil || item.reservedUntil > now) {
      return item;
    }
    return {
      ...item,
      status: STATUS.AVAILABLE,
      claimedBy: null,
      reservedUntil: null,
    };
  });
}

export function claimItem(items, itemId, buyerName, now = Date.now()) {
  const nextItems = releaseExpiredClaims(items, now);
  const index = nextItems.findIndex((item) => item.id === itemId);
  if (index === -1) {
    return { ok: false, items: nextItems, message: "That listing no longer exists." };
  }

  const item = nextItems[index];
  if (item.status !== STATUS.AVAILABLE) {
    return { ok: false, items: nextItems, message: "Item is no longer available." };
  }

  const cleanBuyerName = String(buyerName ?? "").trim();
  if (!cleanBuyerName) {
    return { ok: false, items: nextItems, message: "Enter your name before claiming." };
  }

  nextItems[index] = {
    ...item,
    status: STATUS.RESERVED,
    claimedBy: cleanBuyerName,
    reservedUntil: now + CLAIM_DURATION_MS,
  };
  return { ok: true, items: nextItems, message: "Item reserved. Coordinate the handoff before the timer ends." };
}

export function confirmHandoff(items, itemId, sellerName, now = Date.now()) {
  const nextItems = releaseExpiredClaims(items, now);
  const index = nextItems.findIndex((item) => item.id === itemId);
  if (index === -1) return { ok: false, items: nextItems, message: "That listing no longer exists." };
  const item = nextItems[index];
  if (item.status !== STATUS.RESERVED) return { ok: false, items: nextItems, message: "Only a reserved item can be handed off." };
  if (item.seller !== sellerName) return { ok: false, items: nextItems, message: "Only the seller can confirm this handoff." };

  nextItems[index] = {
    ...item,
    status: STATUS.SOLD,
    reservedUntil: null,
  };
  return { ok: true, items: nextItems, message: "Handoff confirmed. Listing marked sold." };
}

export function markSold(items, itemId, sellerName, now = Date.now()) {
  const nextItems = releaseExpiredClaims(items, now);
  const index = nextItems.findIndex((item) => item.id === itemId);
  if (index === -1) return { ok: false, items: nextItems, message: "That listing no longer exists." };
  const item = nextItems[index];
  if (item.seller !== sellerName) return { ok: false, items: nextItems, message: "Only the seller can override this listing." };

  nextItems[index] = {
    ...item,
    status: STATUS.SOLD,
    reservedUntil: null,
  };
  return { ok: true, items: nextItems, message: "Listing marked sold outside the app." };
}

export function removeListing(items, itemId, sellerName, now = Date.now()) {
  const nextItems = releaseExpiredClaims(items, now);
  const item = nextItems.find((candidate) => candidate.id === itemId);
  if (!item) return { ok: false, items: nextItems, message: "That listing no longer exists." };
  if (item.seller !== sellerName) return { ok: false, items: nextItems, message: "Only the seller can remove this listing." };

  return {
    ok: true,
    items: nextItems.filter((candidate) => candidate.id !== itemId),
    message: "Listing removed immediately.",
  };
}
