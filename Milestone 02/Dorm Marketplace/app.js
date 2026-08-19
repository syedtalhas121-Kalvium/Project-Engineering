import {
  CLAIM_DURATION_MS,
  STATUS,
  claimItem,
  confirmHandoff,
  createItem,
  markSold,
  releaseExpiredClaims,
  removeListing,
  seedItems,
} from "./src-domain.js";

const ITEMS_KEY = "dormly-items-v1";
const ACTIVITY_KEY = "dormly-activity-v1";
const USER = "Alex Johnson";
let timeOffset = 0;
let state = {
  items: loadItems(),
  activity: loadActivity(),
};

const $ = (selector) => document.querySelector(selector);
const currentTime = () => Date.now() + timeOffset;
const formatMoney = (price) => (price === 0 ? "Free" : `₹${price}`);
const formatTime = (timestamp) => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(timestamp);
const remainingSeconds = (until) => Math.max(0, Math.ceil((until - currentTime()) / 1000));
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const initials = (name) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

function loadItems() {
  try {
    const saved = localStorage.getItem(ITEMS_KEY);
    return saved ? JSON.parse(saved) : seedItems();
  } catch {
    return seedItems();
  }
}

function loadActivity() {
  try {
    const saved = localStorage.getItem(ACTIVITY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // Fall through to the intentionally small demo log.
  }
  const now = Date.now();
  return [
    { id: "log-1", type: "listing", text: "Alex Johnson listed Warm desk lamp", time: now - 1000 * 60 * 6 },
    { id: "log-2", type: "listing", text: "Jordan Lee listed Mechanical keyboard", time: now - 1000 * 60 * 14 },
    { id: "log-3", type: "safety", text: "Reservation rules are active for every claim", time: now - 1000 * 60 * 23 },
  ];
}

function persist() {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(state.items));
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(state.activity.slice(0, 20)));
}

function addActivity(type, text) {
  state.activity.unshift({ id: `log-${Date.now()}-${Math.random()}`, type, text, time: currentTime() });
  state.activity = state.activity.slice(0, 20);
}

function sweepExpiredClaims() {
  const expired = state.items.filter((item) => item.status === STATUS.RESERVED && item.reservedUntil <= currentTime());
  if (!expired.length) return;
  state.items = releaseExpiredClaims(state.items, currentTime());
  expired.forEach((item) => addActivity("expiry", `Reservation expired for ${item.title}; item is available again`));
  persist();
  showToast(`${expired.length === 1 ? expired[0].title : "Reservations"} released and available again.`);
}

function artFor(item) {
  const category = item.category.toLowerCase();
  if (category.includes("text")) {
    return `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M29 25c14-6 28-5 40 3v67c-12-8-26-9-40-3z" fill="#fff" stroke="#b5b3d8" stroke-width="2"/><path d="M91 25c-14-6-28-5-40 3v67c12-8 26-9 40-3z" fill="#f5f4ff" stroke="#b5b3d8" stroke-width="2"/><path d="M39 41h19M39 49h19M39 57h14M81 41H62M81 49H62M81 57H67" stroke="#aaa7cf" stroke-width="2" stroke-linecap="round"/><path d="M52 29v65" stroke="#9b98c4" stroke-width="2"/></svg>`;
  }
  if (category.includes("lamp")) {
    return `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M47 43h27l9 33H38z" fill="#fff" stroke="#e5a694" stroke-width="2"/><path d="M42 76h37" stroke="#de967e" stroke-width="3" stroke-linecap="round"/><path d="M60 76v22M42 100h36" stroke="#da927c" stroke-width="3" stroke-linecap="round"/><path d="M50 43l4-13h12l5 13" fill="#fff4ee" stroke="#e5a694" stroke-width="2"/><circle cx="60" cy="36" r="4" fill="#f4c870"/></svg>`;
  }
  if (category.includes("electronic")) {
    return `<svg viewBox="0 0 120 120" aria-hidden="true"><rect x="19" y="43" width="82" height="31" rx="7" fill="#fff" stroke="#9ec4dd" stroke-width="2"/><path d="M25 78h70" stroke="#8eb6d1" stroke-width="4" stroke-linecap="round"/><g fill="#c2dbea">${Array.from({ length: 15 }, (_, index) => `<rect x="${27 + (index % 5) * 13}" y="${48 + Math.floor(index / 5) * 8}" width="9" height="5" rx="1"/>`).join("")}</g></svg>`;
  }
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M35 31h47v48H35z" fill="#fff" stroke="#d9b55d" stroke-width="2"/><path d="M31 81h55M39 81v15M79 81v15M49 31v48" fill="none" stroke="#d2a94e" stroke-width="3" stroke-linecap="round"/><path d="M36 44h46" stroke="#efcf78" stroke-width="3"/></svg>`;
}

function artClass(category) {
  const value = category.toLowerCase();
  if (value.includes("text")) return "";
  if (value.includes("room")) return "peach";
  if (value.includes("electronic")) return "blue";
  return "yellow";
}

function statusMarkup(item) {
  const labels = { available: "Available", reserved: "Reserved", sold: "Sold" };
  return `<span class="status-pill ${item.status}"><span class="status-dot"></span>${labels[item.status]}</span>`;
}

function cardActions(item) {
  if (item.status === STATUS.SOLD) return `<span class="card-action" aria-disabled="true">Closed</span>`;
  if (item.seller === USER) {
    const confirm = item.status === STATUS.RESERVED ? `<button class="card-action primary" data-action="confirm" data-id="${item.id}">Confirm handoff</button>` : "";
    return `<div class="card-actions">${confirm}<button class="card-action" data-action="sold" data-id="${item.id}">Mark sold</button><button class="card-action" data-action="remove" data-id="${item.id}">Remove</button></div>`;
  }
  if (item.status === STATUS.RESERVED) return `<span class="card-action" aria-disabled="true">Held for ${escapeHtml(item.claimedBy)}</span>`;
  return `<button class="card-action primary" data-action="claim" data-id="${item.id}">Claim item</button>`;
}

function renderCard(item) {
  const reservedInfo = item.status === STATUS.RESERVED ? `<div class="countdown">Expires in <strong>${remainingSeconds(item.reservedUntil)}s</strong> · ${escapeHtml(item.claimedBy)}</div>` : "";
  return `<article class="listing-card">
    <div class="item-art ${artClass(item.category)}">${statusMarkup(item)}${artFor(item)}</div>
    <div class="card-body">
      <p class="item-category">${escapeHtml(item.category)} · ${escapeHtml(item.condition)}</p>
      <h3 class="item-title">${escapeHtml(item.title)}</h3>
      <div class="item-meta"><span class="item-price ${item.price === 0 ? "free" : ""}">${formatMoney(item.price)}</span><span class="item-location" title="${escapeHtml(item.pickup)}">⌖ ${escapeHtml(item.pickup)}</span></div>
      ${reservedInfo}
      <div class="card-divider"></div>
      <div class="card-footer"><span class="seller"><span class="avatar avatar-tiny">${initials(item.seller)}</span><span class="seller-name">${escapeHtml(item.seller)}</span></span>${cardActions(item)}</div>
    </div>
  </article>`;
}

function renderActivity() {
  const log = state.activity.slice(0, 5).map((entry) => {
    const isWarning = entry.type === "expiry";
    const icon = entry.type === "listing" ? "+" : entry.type === "expiry" ? "!" : "✓";
    return `<div class="activity-row"><span class="activity-icon ${isWarning ? "warn" : ""}">${icon}</span><span class="activity-text">${escapeHtml(entry.text)}</span><span class="activity-time">${formatTime(entry.time)}</span></div>`;
  }).join("");
  $("#activityLog").innerHTML = log || `<div class="activity-row"><span class="activity-text">No activity yet.</span></div>`;
}

function render() {
  sweepExpiredClaims();
  const searchTerm = $("#searchInput").value.trim().toLowerCase();
  const category = $("#categoryFilter").value;
  const visibleItems = state.items.filter((item) => {
    const matchesSearch = !searchTerm || `${item.title} ${item.category} ${item.pickup}`.toLowerCase().includes(searchTerm);
    return matchesSearch && (category === "all" || item.category === category);
  });
  $("#listingGrid").innerHTML = visibleItems.length ? visibleItems.map(renderCard).join("") : `<div class="empty-state"><strong>No listings match that search.</strong>Try another category or list the first item.</div>`;
  $("#listingCount").textContent = visibleItems.length;
  $("#activeListingCount").textContent = state.items.filter((item) => item.seller === USER && item.status !== STATUS.SOLD).length;
  $("#reservedCount").textContent = state.items.filter((item) => item.status === STATUS.RESERVED).length;
  $("#completedCount").textContent = state.items.filter((item) => item.status === STATUS.SOLD).length;
  $("#activityCount").textContent = state.activity.length;
  renderActivity();
}

function showToast(message, error = false) {
  const toast = document.createElement("div");
  toast.className = `toast ${error ? "error" : ""}`;
  toast.innerHTML = `<span>${error ? "!" : "✓"}</span><span>${escapeHtml(message)}</span>`;
  $("#toastRegion").append(toast);
  setTimeout(() => toast.remove(), 4200);
}

function openClaimModal(item) {
  $("#claimTitle").textContent = `Claim ${item.title}`;
  $("#claimForm [name=itemId]").value = item.id;
  $("#claimModal").showModal();
}

function closeModal(id) {
  const dialog = document.getElementById(id);
  if (dialog?.open) dialog.close();
}

function applyResult(result) {
  state.items = result.items;
  if (result.ok) persist();
  render();
  showToast(result.message, !result.ok);
}

$("#listingGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const item = state.items.find((candidate) => candidate.id === button.dataset.id);
  if (!item) return;
  const action = button.dataset.action;
  if (action === "claim") return openClaimModal(item);
  if (action === "confirm") return applyResult(confirmHandoff(state.items, item.id, USER, currentTime()));
  if (action === "sold") return applyResult(markSold(state.items, item.id, USER, currentTime()));
  if (action === "remove") return applyResult(removeListing(state.items, item.id, USER, currentTime()));
});

$("#claimForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const result = claimItem(state.items, form.get("itemId"), form.get("buyerName"), currentTime());
  if (result.ok) {
    const item = result.items.find((candidate) => candidate.id === form.get("itemId"));
    addActivity("claim", `${form.get("buyerName")} reserved ${item.title}`);
    persist();
    closeModal("claimModal");
    state.items = result.items;
    render();
    showToast(result.message);
  } else {
    state.items = result.items;
    render();
    showToast(result.message, true);
  }
});

$("#listingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const form = new FormData(event.currentTarget);
    const item = createItem({ ...Object.fromEntries(form.entries()), seller: USER }, currentTime());
    state.items.unshift(item);
    addActivity("listing", `${USER} listed ${item.title}`);
    persist();
    event.currentTarget.reset();
    closeModal("listingModal");
    render();
    showToast("Your listing is live on campus.");
  } catch (error) {
    showToast(error.message, true);
  }
});

$("#openListingModal").addEventListener("click", () => $("#listingModal").showModal());
$("#resetDemo").addEventListener("click", () => {
  state.items = seedItems(currentTime());
  state.activity = [{ id: `log-${Date.now()}`, type: "safety", text: "Demo reset: reservation rules are active", time: currentTime() }];
  timeOffset = 0;
  persist();
  render();
  showToast("Demo data reset.");
});
$("#searchInput").addEventListener("input", render);
$("#categoryFilter").addEventListener("change", render);
document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-modal]");
  if (closeButton) closeModal(closeButton.dataset.closeModal);
  if (event.target.matches("dialog")) event.target.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement.tagName !== "INPUT") {
    event.preventDefault();
    $("#searchInput").focus();
  }
});

setInterval(() => render(), 1000);
render();

// Keep the state machine visible during demos: a reserved item can be advanced to its deadline.
const demoClockButton = document.createElement("button");
demoClockButton.className = "text-button";
demoClockButton.type = "button";
demoClockButton.textContent = "Advance clock 60s  ↗";
demoClockButton.addEventListener("click", () => {
  timeOffset += CLAIM_DURATION_MS + 1000;
  render();
  showToast("Demo clock advanced. Expired reservations were released.");
});
$(".sidebar-bottom").insertBefore(demoClockButton, $("#resetDemo"));
