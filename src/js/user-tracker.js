// src/js/user-tracker.js
import { Store } from "./store.js";

const STAGES = ["Pending", "Preparing", "Out for Delivery", "Delivered"];

const STAGE_META = {
  Pending: {
    label: "Order Received",
    desc: "Waiting for restaurant confirmation.",
    icon: "1",
  },
  Preparing: {
    label: "Preparing in Kitchen",
    desc: "Chefs are freshly cooking your dishes.",
    icon: "2",
  },
  "Out for Delivery": {
    label: "Out for Delivery",
    desc: "Rider is on the way to your address.",
    icon: "3",
  },
  Delivered: {
    label: "Delivered",
    desc: "Enjoy your meal!",
    icon: "4",
  },
};

const els = {
  brandName: document.getElementById("trackerBrandName"),
  footerBrand: document.getElementById("trackerFooterBrand"),
  form: document.getElementById("trackSearchForm"),
  input: document.getElementById("trackOrderInput"),
  resultCard: document.getElementById("orderResultCard"),
  emptyState: document.getElementById("orderEmptyState"),
  emptyMessage: document.getElementById("emptyStateMessage"),
  recentSection: document.getElementById("recentOrdersSection"),
  recentChips: document.getElementById("recentOrderChips"),
};

let currentOrderId = null;

function formatPrice(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

function getInitialOrderId() {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get("id");
  if (queryId) return queryId.trim().toUpperCase();

  const savedLast = localStorage.getItem("restro_last_order_id");
  if (savedLast) return savedLast.trim().toUpperCase();

  const allOrders = Store.getOrders();
  return allOrders.length > 0 ? allOrders[0].orderId : null;
}

function computeDeliveryText(order) {
  if (order.status === "Cancelled") return "Order Cancelled";
  if (order.status === "Delivered") return "Delivered";

  const created = new Date(order.createdAt).getTime();
  const totalMins = Number(order.estDeliveryMins || 35);
  const elapsedMins = Math.max(0, Math.floor((Date.now() - created) / 60000));
  const remaining = Math.max(5, totalMins - elapsedMins);

  if (order.status === "Out for Delivery") {
    return `Arriving in ~${Math.min(remaining, 15)} mins`;
  }
  return `Est. ~${remaining} mins remaining (${totalMins}m total)`;
}

function renderTracker() {
  const settings = Store.getSettings();
  els.brandName.textContent = settings.restaurantName;
  els.footerBrand.textContent = `${settings.restaurantName} • Live Order Tracking`;

  const orders = Store.getOrders();
  if (orders.length > 0) {
    els.recentSection.classList.remove("hidden");
    els.recentChips.innerHTML = orders
      .slice(0, 6)
      .map((o) => {
        const active =
          currentOrderId &&
          o.orderId.toUpperCase() === currentOrderId.toUpperCase();
        return `
          <button
            type="button"
            data-select-order="${o.orderId}"
            class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              active
                ? "bg-amber-600 text-white"
                : "bg-white text-stone-700 border border-stone-300 hover:border-amber-500"
            }"
          >
            #${o.orderId} • ${o.status}
          </button>
        `;
      })
      .join("");
  } else {
    els.recentSection.classList.add("hidden");
  }

  const order = currentOrderId ? Store.getOrderById(currentOrderId) : null;

  if (!order) {
    els.resultCard.classList.add("hidden");
    els.emptyState.classList.remove("hidden");
    els.emptyMessage.textContent = currentOrderId
      ? `No order found with ID "${currentOrderId}". Please check the ID and try again.`
      : "No active order loaded yet. Place an order on the menu or enter an Order ID above.";
    return;
  }

  els.emptyState.classList.add("hidden");
  els.resultCard.classList.remove("hidden");

  const isCancelled = order.status === "Cancelled";
  const currentIndex = STAGES.indexOf(order.status);
  const progressPercent = isCancelled
    ? 0
    : currentIndex >= 0
      ? Math.round(((currentIndex + 1) / STAGES.length) * 100)
      : 25;

  els.resultCard.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-6">
      <div>
        <div class="flex items-center gap-2.5">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-700">Order Reference</span>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${
            isCancelled
              ? "bg-rose-100 text-rose-700"
              : order.status === "Delivered"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800"
          }">${order.status}</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-bold text-stone-900 mt-1">#${order.orderId}</h2>
        <p class="text-xs text-stone-500 mt-1">
          Placed at ${new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left sm:text-right">
        <p class="text-[11px] font-bold uppercase tracking-wider text-amber-800">Delivery Window</p>
        <p class="text-base sm:text-lg font-bold text-stone-900 mt-0.5">${computeDeliveryText(order)}</p>
      </div>
    </div>

    ${
      isCancelled
        ? `<div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
            This order was cancelled. If you have questions, please contact the restaurant via WhatsApp.
           </div>`
        : `
      <div class="space-y-4">
        <div class="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
          <div class="h-full bg-amber-600 transition-all duration-500" style="width: ${progressPercent}%"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          ${STAGES.map((stage, idx) => {
            const meta = STAGE_META[stage];
            const done = idx <= currentIndex;
            const current = idx === currentIndex;
            return `
              <div class="p-3.5 rounded-xl border ${
                current
                  ? "bg-amber-50/80 border-amber-400"
                  : done
                    ? "bg-stone-50 border-stone-200"
                    : "bg-white border-stone-100 opacity-60"
              }">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    done
                      ? "bg-amber-600 text-white"
                      : "bg-stone-200 text-stone-600"
                  }">${meta.icon}</span>
                  <span class="text-xs font-bold text-stone-900">${meta.label}</span>
                </div>
                <p class="text-[11px] text-stone-600 mt-2 leading-relaxed">${meta.desc}</p>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `
    }

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-stone-100">
      <div class="space-y-2 text-sm">
        <h3 class="font-bold text-stone-900">Delivery Details</h3>
        <p class="text-stone-700"><span class="text-stone-400">Customer:</span> ${order.customerName}</p>
        <p class="text-stone-700"><span class="text-stone-400">Phone:</span> ${order.phone}</p>
        <p class="text-stone-700"><span class="text-stone-400">Address:</span> ${order.address}</p>
        ${order.notes ? `<p class="text-stone-700"><span class="text-stone-400">Notes:</span> ${order.notes}</p>` : ""}
      </div>

      <div class="bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
        <h3 class="font-bold text-stone-900">Order Summary</h3>
        ${order.items
          .map(
            (
              i,
            ) => `<div class="flex justify-between text-stone-700 text-xs sm:text-sm">
              <span>${i.qty}x ${i.name}</span>
              <span class="font-medium">${formatPrice(i.price * i.qty)}</span>
            </div>`,
          )
          .join("")}
        <div class="pt-2 border-t border-stone-200 flex justify-between text-xs text-stone-500">
          <span>Delivery Fee</span>
          <span>${formatPrice(order.deliveryFee)}</span>
        </div>
        <div class="flex justify-between font-bold text-stone-900 text-base pt-1">
          <span>Total Paid</span>
          <span class="text-amber-700">${formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  `;
}

// Form search
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  currentOrderId = els.input.value.trim().toUpperCase();
  renderTracker();
});

// Recent chip selection
els.recentChips.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-select-order]");
  if (!btn) return;
  currentOrderId = btn.dataset.selectOrder.toUpperCase();
  els.input.value = currentOrderId;
  renderTracker();
});

// Live sync across tabs & same tab
window.addEventListener("storage", renderTracker);
window.addEventListener("restro:updated", renderTracker);

// Refresh countdown every 30 seconds
setInterval(renderTracker, 30000);

currentOrderId = getInitialOrderId();
if (currentOrderId) {
  els.input.value = currentOrderId;
}
renderTracker();
