// src/js/user-ui.js
import { Store, getEffectivePrice } from "./store.js";
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

// Gulgasht Colony, Multan, Punjab, Pakistan
const GULGASHT_MULTAN = { lat: 30.2225, lng: 71.4718 };
// Multan city delivery bounding box
const MULTAN_BOUNDS = {
  minLat: 30.08,
  maxLat: 30.33,
  minLng: 71.33,
  maxLng: 71.63,
};

let selectedCoords = { ...GULGASHT_MULTAN };
let pinInsideMultan = true;
let checkoutMap = null;
let checkoutMarker = null;

const els = {
  navBrandName: document.getElementById("navBrandName"),
  footerBrandText: document.getElementById("footerBrandText"),
  activeOrderDot: document.getElementById("activeOrderDot"),
  userProfileBtn: document.getElementById("userProfileBtn"),
  userAvatarInitial: document.getElementById("userAvatarInitial"),
  userProfileName: document.getElementById("userProfileName"),
  guestAuthButtons: document.getElementById("guestAuthButtons"),
  profileBackdrop: document.getElementById("profileBackdrop"),
  profileDrawer: document.getElementById("profileDrawer"),
  closeProfileBtn: document.getElementById("closeProfileBtn"),
  profileDetailsCard: document.getElementById("profileDetailsCard"),
  userOrdersList: document.getElementById("userOrdersList"),
  userLogoutBtn: document.getElementById("userLogoutBtn"),
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
  pinLocationStatus: document.getElementById("pinLocationStatus"),
  useMyGpsBtn: document.getElementById("useMyGpsBtn"),
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

function isWithinMultanBounds(lat, lng) {
  return (
    lat >= MULTAN_BOUNDS.minLat &&
    lat <= MULTAN_BOUNDS.maxLat &&
    lng >= MULTAN_BOUNDS.minLng &&
    lng <= MULTAN_BOUNDS.maxLng
  );
}

async function detectAddressFromPin(lat, lng) {
  selectedCoords = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
  const inBounds = isWithinMultanBounds(lat, lng);

  if (!inBounds) {
    pinInsideMultan = false;
    els.pinLocationStatus.textContent =
      "✕ Outside Multan! Delivery is only available inside Multan, Punjab, Pakistan.";
    els.pinLocationStatus.className = "text-[11px] text-rose-600 font-semibold";
    return;
  }

  pinInsideMultan = true;
  els.pinLocationStatus.textContent = "Detecting exact Multan street/area...";
  els.pinLocationStatus.className = "text-[11px] text-amber-700 font-medium";

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    );
    const data = await res.json();
    const display = data.display_name || "";

    if (display && !/multan/i.test(display) && !inBounds) {
      pinInsideMultan = false;
      els.pinLocationStatus.textContent =
        "✕ Outside Multan! Move the pin inside Multan, Punjab, Pakistan.";
      els.pinLocationStatus.className =
        "text-[11px] text-rose-600 font-semibold";
      return;
    }

    const cleanAddress = display
      ? display.split(",").slice(0, 4).join(", ")
      : `Near (${selectedCoords.lat}, ${selectedCoords.lng}), Multan, Punjab, Pakistan`;

    document.getElementById("custAddress").value = cleanAddress;
    els.pinLocationStatus.textContent = `✓ Multan Location Detected: ${cleanAddress}`;
    els.pinLocationStatus.className =
      "text-[11px] text-emerald-700 font-medium";
  } catch {
    const fallback = `Pin (${selectedCoords.lat}, ${selectedCoords.lng}), Multan, Punjab, Pakistan`;
    if (!document.getElementById("custAddress").value) {
      document.getElementById("custAddress").value = fallback;
    }
    els.pinLocationStatus.textContent = `✓ Pinned in Multan (${selectedCoords.lat}, ${selectedCoords.lng})`;
    els.pinLocationStatus.className =
      "text-[11px] text-emerald-700 font-medium";
  }
}

function initMaps() {
  if (typeof window.L === "undefined") return;

  // 1. Bottom Store Map (Gulgasht Colony, Multan, Punjab, Pakistan)
  const storeMapEl = document.getElementById("storeLocationMap");
  if (storeMapEl && !storeMapEl.dataset.ready) {
    storeMapEl.dataset.ready = "true";
    const storeMap = window.L.map("storeLocationMap").setView(
      [GULGASHT_MULTAN.lat, GULGASHT_MULTAN.lng],
      15,
    );
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(storeMap);

    window.L.marker([GULGASHT_MULTAN.lat, GULGASHT_MULTAN.lng])
      .addTo(storeMap)
      .bindPopup(
        "<strong>Zaiqa Royal Kitchen</strong><br>Gulgasht Colony, Multan, Punjab, Pakistan",
      )
      .openPopup();
  }

  // 2. Checkout Draggable Pin Map
  const pinMapEl = document.getElementById("checkoutPinMap");
  if (pinMapEl && !checkoutMap) {
    checkoutMap = window.L.map("checkoutPinMap").setView(
      [GULGASHT_MULTAN.lat, GULGASHT_MULTAN.lng],
      13,
    );
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(checkoutMap);

    checkoutMarker = window.L.marker(
      [GULGASHT_MULTAN.lat, GULGASHT_MULTAN.lng],
      {
        draggable: true,
      },
    ).addTo(checkoutMap);

    checkoutMarker.on("dragend", () => {
      const pos = checkoutMarker.getLatLng();
      detectAddressFromPin(pos.lat, pos.lng);
    });

    checkoutMap.on("click", (e) => {
      checkoutMarker.setLatLng(e.latlng);
      detectAddressFromPin(e.latlng.lat, e.latlng.lng);
    });
  }
}

function renderProfileDrawer() {
  const user = Auth.getCurrentUser();
  if (!user) return;

  els.profileDetailsCard.innerHTML = `
    <p class="font-bold text-base text-stone-900">${user.name}</p>
    <p class="text-xs text-stone-600"><span class="font-semibold">Email:</span> ${user.email}</p>
    <p class="text-xs text-stone-600"><span class="font-semibold">Phone:</span> ${user.phone}</p>
    <p class="text-xs text-stone-600"><span class="font-semibold">Saved Address:</span> ${user.address}</p>
  `;

  const myOrders = Store.getOrdersByUserEmail(user.email);
  if (myOrders.length === 0) {
    els.userOrdersList.innerHTML = `<p class="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl p-4">No orders placed under this account yet.</p>`;
    return;
  }

  els.userOrdersList.innerHTML = myOrders
    .map(
      (o) => `
      <div class="border border-stone-200 rounded-xl p-3.5 space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-bold text-amber-700">#${o.orderId}</span>
          <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">${o.status}</span>
        </div>
        <p class="text-stone-600">${o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</p>
        <div class="flex items-center justify-between pt-1 border-t border-stone-100">
          <span class="font-bold text-stone-900">${formatPrice(o.total)}</span>
          <a href="./track-order.html?id=${encodeURIComponent(o.orderId)}" class="text-amber-700 font-semibold hover:underline">
            Track Live →
          </a>
        </div>
      </div>`,
    )
    .join("");
}

function renderBrand() {
  const settings = Store.getSettings();
  document.title = `${settings.restaurantName} | Order Fresh Online`;
  els.navBrandName.textContent = settings.restaurantName;
  els.footerBrandText.textContent = `${settings.restaurantName} • Gulgasht Colony, Multan, Punjab, Pakistan`;

  const lastOrderId = localStorage.getItem("restro_last_order_id");
  const lastOrder = lastOrderId ? Store.getOrderById(lastOrderId) : null;
  const hasActive =
    lastOrder && !["Delivered", "Cancelled"].includes(lastOrder.status);
  els.activeOrderDot.classList.toggle("hidden", !hasActive);

  const currentUser = Auth.getCurrentUser();
  if (currentUser) {
    els.userProfileBtn.classList.remove("hidden");
    els.userProfileBtn.classList.add("flex");
    els.guestAuthButtons.classList.add("hidden");
    els.userAvatarInitial.textContent = currentUser.name
      .charAt(0)
      .toUpperCase();
    els.userProfileName.textContent = currentUser.name.split(" ")[0];

    const nameEl = document.getElementById("custName");
    const phoneEl = document.getElementById("custPhone");
    const addrEl = document.getElementById("custAddress");
    if (nameEl && !nameEl.value) nameEl.value = currentUser.name;
    if (phoneEl && !phoneEl.value) phoneEl.value = currentUser.phone;
    if (addrEl && !addrEl.value) addrEl.value = currentUser.address;

    renderProfileDrawer();
  } else {
    els.userProfileBtn.classList.add("hidden");
    els.userProfileBtn.classList.remove("flex");
    els.guestAuthButtons.classList.remove("hidden");
  }
}

function renderCategories() {
  els.categoryFilters.innerHTML = CATEGORIES.map((cat) => {
    const active = selectedCategory === cat;
    return `
      <button type="button" data-category="${cat}"
        class="px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition cursor-pointer ${
          active
            ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40"
            : "bg-[#181614] text-stone-300 border border-stone-800 hover:border-amber-500/50 hover:text-amber-300"
        }">
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
      <div class="col-span-full bg-[#181614] border border-stone-800 rounded-2xl p-12 text-center text-stone-400">
        No dishes found matching your selection.
      </div>
    `;
    return;
  }

  els.menuGrid.innerHTML = filtered
    .map((item) => {
      const available = Boolean(item.inStock);
      const off = Number(item.offPercent || 0);
      const finalPrice = getEffectivePrice(item);

      return `
        <article class="group bg-[#171513] border border-stone-800/90 hover:border-amber-500/40 rounded-2xl overflow-hidden shadow-xl transition duration-300 flex flex-col">
          <div class="relative h-56 bg-stone-900 overflow-hidden">
            <img src="${item.image}" alt="${item.name}" loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition duration-500 ${available ? "" : "grayscale opacity-50"}" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#171513] via-transparent to-black/30"></div>
            <span class="absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-semibold bg-black/75 backdrop-blur-xs text-amber-300 border border-amber-500/20">
              ${item.category}
            </span>
            ${
              off > 0 && available
                ? `<span class="absolute top-3.5 right-3.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow">${off}% OFF</span>`
                : ""
            }
            ${
              !available
                ? `<span class="absolute top-3.5 right-3.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-600 text-white">Sold Out</span>`
                : `<span class="absolute bottom-3 right-3.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/75 text-stone-200">~${item.prepTime}m prep</span>`
            }
          </div>

          <div class="p-6 flex-1 flex flex-col justify-between gap-5">
            <div>
              <div class="flex items-start justify-between gap-3">
                <h3 class="font-serif text-xl font-bold text-white leading-snug group-hover:text-amber-300 transition">${item.name}</h3>
                <div class="text-right whitespace-nowrap">
                  <span class="text-base font-bold text-amber-400">${formatPrice(finalPrice)}</span>
                  ${
                    off > 0
                      ? `<span class="block text-xs line-through text-stone-500">${formatPrice(item.price)}</span>`
                      : ""
                  }
                </div>
              </div>
              <p class="text-xs sm:text-sm text-stone-400 mt-2 line-clamp-2 leading-relaxed">${item.description}</p>
            </div>

            <button type="button" data-add-to-cart="${item.id}" ${available ? "" : "disabled"}
              class="w-full py-3 px-4 rounded-full text-xs uppercase tracking-[0.18em] font-bold transition ${
                available
                  ? "bg-stone-900 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-500/30 cursor-pointer"
                  : "bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed"
              }">
              ${available ? "+ Add to Order" : "Currently Unavailable"}
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
      <div class="py-8 text-center text-stone-500 text-sm">
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
          <button type="button" data-qty-delta="-1" data-item-id="${item.id}"
            class="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-sm cursor-pointer">−</button>
          <span class="w-5 text-center text-sm font-semibold">${item.qty}</span>
          <button type="button" data-qty-delta="1" data-item-id="${item.id}"
            class="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-sm cursor-pointer">+</button>
        </div>
      </div>
    `,
    )
    .join("");
}

function openCart() {
  els.cartBackdrop.classList.remove("hidden");
  els.cartDrawer.classList.remove("translate-x-full");
  setTimeout(() => {
    if (checkoutMap) checkoutMap.invalidateSize();
  }, 260);
}

function closeCart() {
  els.cartDrawer.classList.add("translate-x-full");
  setTimeout(() => els.cartBackdrop.classList.add("hidden"), 250);
}

function openProfile() {
  renderProfileDrawer();
  els.profileBackdrop.classList.remove("hidden");
  els.profileDrawer.classList.remove("-translate-x-full");
}

function closeProfile() {
  els.profileDrawer.classList.add("-translate-x-full");
  setTimeout(() => els.profileBackdrop.classList.add("hidden"), 250);
}

els.openCartBtn.addEventListener("click", openCart);
els.closeCartBtn.addEventListener("click", closeCart);
els.cartBackdrop.addEventListener("click", closeCart);

els.userProfileBtn.addEventListener("click", openProfile);
els.closeProfileBtn.addEventListener("click", closeProfile);
els.profileBackdrop.addEventListener("click", closeProfile);

els.userLogoutBtn.addEventListener("click", () => {
  Auth.logoutUser();
  closeProfile();
  renderBrand();
});

els.useMyGpsBtn.addEventListener("click", () => {
  if (!navigator.geolocation)
    return alert("GPS is not supported in this browser.");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (checkoutMap && checkoutMarker) {
        checkoutMap.setView([latitude, longitude], 15);
        checkoutMarker.setLatLng([latitude, longitude]);
      }
      detectAddressFromPin(latitude, longitude);
    },
    () =>
      alert(
        "Could not access GPS location. Please drag the pin manually on the Multan map.",
      ),
  );
});

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

els.checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!pinInsideMultan) {
    return alert(
      "Delivery is only available inside Multan, Punjab, Pakistan. Please place the map pin inside Multan.",
    );
  }

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

  const currentUser = Auth.getCurrentUser();
  const order = await Store.createOrder({
    customerName: nameCheck.value,
    phone: phoneCheck.value,
    address: addrCheck.value,
    coords: selectedCoords,
    notes: document.getElementById("custNotes").value.trim(),
    userEmail: currentUser ? currentUser.email : "",
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

initMaps();
refreshAll();
