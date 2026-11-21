// src/js/user-ui.js
import { Store } from "./store.js";
import { Auth } from "./auth.js";
import { Validators } from "./validators.js";

const CATEGORIES = [
  "All",
  "Starters",
  "Mains",
  "BBQ & Grills",
  "Desserts",
  "Beverages",
];
let selectedCategory = "All";
let searchQuery = "";

const els = {
  navBrandName: document.getElementById("navBrandName"),
  heroTitle: document.getElementById("heroTitle"),
  footerBrandText: document.getElementById("footerBrandText"),
  activeOrderDot: document.getElementById("activeOrderDot"),
  openCartBtn: document.getElementById("openCartBtn"),
  closeCartBtn: document.getElementById("closeCartBtn"),
  cartBackdrop: document.getElementById("cartBackdrop"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartCountBadge: document.getElementById("cartCountBadge"),
  cartEtaText: document.getElementById("cartEtaText"),
  cartItemsContainer: document.getElementById("cartItemsContainer"),
  cartSubtotal: document.getElementById("cartSubtotal"),
  cartDeliveryFee: document.getElementById("cartDeliveryFee"),
  cartGrandTotal: document.getElementById("cartGrandTotal"),
  checkoutForm: document.getElementById("checkoutForm"),
  placeOrderBtn: document.getElementById("placeOrderBtn"),
  orderSuccessBox: document.getElementById("orderSuccessBox"),
  orderSuccessDetails: document.getElementById("orderSuccessDetails"),
  whatsappConfirmLink: document.getElementById("whatsappConfirmLink"),
  trackCreatedOrderLink: document.getElementById("trackCreatedOrderLink"),
  categoryFilters: document.getElementById("categoryFilters"),
  menuGrid: document.getElementById("menuGrid"),
  menuSearchInput: document.getElementById("menuSearchInput"),
};

function formatPrice(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

// 1. INSIDE renderBrand()
function renderBrand() {
  const settings = Store.getSettings();
  document.title = `${settings.restaurantName} | Order Fresh Online`;
  els.navBrandName.textContent = settings.restaurantName;
  els.footerBrandText.textContent = `${settings.restaurantName} • Real-Time Menu & Order System`;

  const lastOrderId = localStorage.getItem("restro_last_order_id");
  const lastOrder = lastOrderId ? Store.getOrderById(lastOrderId) : null;
  const hasActive =
    lastOrder && !["Delivered", "Cancelled"].includes(lastOrder.status);
  els.activeOrderDot.classList.toggle("hidden", !hasActive);

  // Auto-fill logged-in user details if empty & update navbar auth label
  const currentUser = Auth.getCurrentUser();
  const authLink = document.getElementById("navAuthLink");
  if (authLink) {
    authLink.textContent = currentUser
      ? `Hi, ${currentUser.name.split(" ")[0]}`
      : "Login / Sign Up";
  }
  if (currentUser) {
    const nameEl = document.getElementById("custName");
    const phoneEl = document.getElementById("custPhone");
    const addrEl = document.getElementById("custAddress");
    if (nameEl && !nameEl.value) nameEl.value = currentUser.name;
    if (phoneEl && !phoneEl.value) phoneEl.value = currentUser.phone;
    if (addrEl && !addrEl.value) addrEl.value = currentUser.address;
  }
}

function renderCategories() {
  els.categoryFilters.innerHTML = CATEGORIES.map((cat) => {
    const active = selectedCategory === cat;
    return `
      <button
        type="button"
        data-category="${cat}"
        class="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer ${
          active
            ? "bg-amber-600 text-white shadow-sm"
            : "bg-white text-stone-700 border border-stone-200 hover:border-amber-500"
        }"
      >
        ${cat}
      </button>
    `;
  }).join("");
}

function renderMenu() {
  const allItems = Store.getMenu();
  const filtered = allItems.filter((item) => {
    const matchesCat =
      selectedCategory === "All" || item.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    els.menuGrid.innerHTML = `
      <div class="col-span-full bg-white border border-stone-200 rounded-2xl p-10 text-center text-stone-500">
        No dishes found matching your filter.
      </div>
    `;
    return;
  }

  els.menuGrid.innerHTML = filtered
    .map((item) => {
      const available = Boolean(item.inStock);
      return `
        <article class="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
          <div class="relative h-48 bg-stone-200">
            <img
              src="${item.image}"
              alt="${item.name}"
              loading="lazy"
              class="w-full h-full object-cover ${available ? "" : "grayscale opacity-60"}"
            />
            <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-900/80 text-amber-300">
              ${item.category}
            </span>
            ${
              !available
                ? `<span class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">Out of Stock</span>`
                : `<span class="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-stone-700">~${item.prepTime}m prep</span>`
            }
          </div>

          <div class="p-5 flex-1 flex flex-col justify-between gap-4">
            <div>
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-lg font-bold text-stone-900 leading-snug">${item.name}</h3>
                <span class="text-base font-bold text-amber-700 whitespace-nowrap">${formatPrice(item.price)}</span>
              </div>
              <p class="text-xs sm:text-sm text-stone-600 mt-1.5 line-clamp-2">${item.description}</p>
            </div>

            <button
              type="button"
              data-add-to-cart="${item.id}"
              ${available ? "" : "disabled"}
              class="w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition ${
                available
                  ? "bg-stone-900 hover:bg-amber-600 text-white cursor-pointer"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }"
            >
              ${available ? "+ Add to Cart" : "Currently Unavailable"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCart() {
  const { cart, subtotal, deliveryFee, total, estDeliveryMins, itemCount } =
    Store.getCartSummary();

  els.cartCountBadge.textContent = itemCount;
  els.cartEtaText.textContent =
    cart.length > 0
      ? `Est. delivery time: ~${estDeliveryMins} mins`
      : "Add items to see delivery estimate";

  els.cartSubtotal.textContent = formatPrice(subtotal);
  els.cartDeliveryFee.textContent = formatPrice(deliveryFee);
  els.cartGrandTotal.textContent = formatPrice(total);
  els.placeOrderBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    els.cartItemsContainer.innerHTML = `
      <div class="py-12 text-center text-stone-500 text-sm">
        Your cart is empty. Pick a dish from the menu to get started.
      </div>
    `;
    return;
  }

  els.cartItemsContainer.innerHTML = cart
    .map(
      (item) => `
      <div class="flex items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div class="flex items-center gap-3 min-w-0">
          <img src="${item.image}" alt="${item.name}" class="w-14 h-14 rounded-xl object-cover bg-stone-100 shrink-0" />
          <div class="min-w-0">
            <h4 class="text-sm font-bold text-stone-900 truncate">${item.name}</h4>
            <p class="text-xs text-stone-500">${formatPrice(item.price)} each</p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-qty-delta="-1"
            data-item-id="${item.id}"
            class="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-sm cursor-pointer"
          >
            −
          </button>
          <span class="w-5 text-center text-sm font-semibold">${item.qty}</span>
          <button
            type="button"
            data-qty-delta="1"
            data-item-id="${item.id}"
            class="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-sm cursor-pointer"
          >
            +
          </button>
        </div>
      </div>
    `,
    )
    .join("");
}

function openCart() {
  els.cartBackdrop.classList.remove("hidden");
  els.cartDrawer.classList.remove("translate-x-full");
}

function closeCart() {
  els.cartDrawer.classList.add("translate-x-full");
  setTimeout(() => els.cartBackdrop.classList.add("hidden"), 250);
}

// Event Listeners
els.openCartBtn.addEventListener("click", openCart);
els.closeCartBtn.addEventListener("click", closeCart);
els.cartBackdrop.addEventListener("click", closeCart);

els.categoryFilters.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-category]");
  if (!btn) return;
  selectedCategory = btn.dataset.category;
  renderCategories();
  renderMenu();
});

els.menuSearchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderMenu();
});

els.menuGrid.addEventListener("click", (e) => {
  const addBtn = e.target.closest("[data-add-to-cart]");
  if (!addBtn) return;
  const added = Store.addToCart(addBtn.dataset.addToCart);
  if (added) {
    renderCart();
    openCart();
  }
});

els.cartItemsContainer.addEventListener("click", (e) => {
  const qtyBtn = e.target.closest("[data-qty-delta]");
  if (!qtyBtn) return;
  Store.updateCartQty(qtyBtn.dataset.itemId, Number(qtyBtn.dataset.qtyDelta));
  renderCart();
});

// 2. CHECKOUT FORM SUBMIT WITH VALIDATION
els.checkoutForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const nameCheck = Validators.validateName(
    document.getElementById("custName").value,
  );
  if (!nameCheck.ok) return alert(nameCheck.msg);

  const phoneCheck = Validators.validatePhone(
    document.getElementById("custPhone").value,
  );
  if (!phoneCheck.ok) return alert(phoneCheck.msg);

  const addrCheck = Validators.validateAddress(
    document.getElementById("custAddress").value,
  );
  if (!addrCheck.ok) return alert(addrCheck.msg);

  const order = Store.createOrder({
    customerName: nameCheck.value,
    phone: phoneCheck.value,
    address: addrCheck.value,
    notes: document.getElementById("custNotes").value.trim(),
  });

  if (!order) return;

  const waUrl = Store.buildWhatsAppURL(order);
  window.open(waUrl, "_blank", "noopener,noreferrer");

  els.orderSuccessDetails.textContent = `Order #${order.orderId} (${formatPrice(order.total)}) created. Est. delivery: ~${order.estDeliveryMins} mins.`;
  els.whatsappConfirmLink.href = waUrl;
  els.trackCreatedOrderLink.href = `./track-order.html?id=${encodeURIComponent(order.orderId)}`;
  els.orderSuccessBox.classList.remove("hidden");
  els.checkoutForm.reset();

  renderBrand();
  renderCart();
});

function refreshAll() {
  renderBrand();
  renderCategories();
  renderMenu();
  renderCart();
}

window.addEventListener("storage", refreshAll);
window.addEventListener("restro:updated", refreshAll);

refreshAll();
