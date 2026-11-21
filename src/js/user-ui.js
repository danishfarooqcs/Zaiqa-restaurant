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
const THEME_KEY = "restro_theme_v1";

let selectedCategory = "All";
let searchQuery = "";
// Default to warm editorial light mode (like reference), toggleable to dark mode
let currentTheme =
  localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
let toastTimer = null;

// null = checkout uses full cart; object = single-item "Order Now" mode
let directOrderItem = null;

// Gulgasht Colony, Multan, Punjab, Pakistan
const GULGASHT_MULTAN = { lat: 30.2225, lng: 71.4718 };
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
  pageBody: document.getElementById("pageBody"),
  mainHeader: document.getElementById("mainHeader"),
  mobileSubBar: document.getElementById("mobileSubBar"),
  mobileSignupLink: document.getElementById("mobileSignupLink"),
  navBrandName: document.getElementById("navBrandName"),
  navSubtitle: document.getElementById("navSubtitle"),
  desktopNav: document.getElementById("desktopNav"),
  navLoginBtn: document.getElementById("navLoginBtn"),
  navSignupBtn: document.getElementById("navSignupBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  themeIcon: document.getElementById("themeIcon"),
  themeLabel: document.getElementById("themeLabel"),
  cartToast: document.getElementById("cartToast"),
  cartToastText: document.getElementById("cartToastText"),
  heroSection: document.getElementById("heroSection"),
  heroTitle: document.getElementById("heroTitle"),
  heroDesc: document.getElementById("heroDesc"),
  heroFloatingCard: document.getElementById("heroFloatingCard"),
  storySection: document.getElementById("story-section"),
  storyHeading: document.getElementById("storyHeading"),
  storyBody: document.getElementById("storyBody"),
  featureCard1: document.getElementById("featureCard1"),
  featureCard2: document.getElementById("featureCard2"),
  menuHeading: document.getElementById("menuHeading"),
  menuSubheading: document.getElementById("menuSubheading"),
  mainFooter: document.getElementById("mainFooter"),
  footerBrandTitle: document.getElementById("footerBrandTitle"),
  footerBrandText: document.getElementById("footerBrandText"),
  activeOrderDot: document.getElementById("activeOrderDot"),
  mobileOrderDot: document.getElementById("mobileOrderDot"),
  mobileOrderBar: document.getElementById("mobileOrderBar"),
  mobileOpenCartBtn: document.getElementById("mobileOpenCartBtn"),
  mobileCartCount: document.getElementById("mobileCartCount"),
  mobileCartTotal: document.getElementById("mobileCartTotal"),
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
  drawerHeading: document.getElementById("drawerHeading"),
  showFullCartBtn: document.getElementById("showFullCartBtn"),
  directShowCartCount: document.getElementById("directShowCartCount"),
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

function showCartToast(message) {
  if (!els.cartToast || !els.cartToastText) return;
  els.cartToastText.textContent = message;
  els.cartToast.classList.remove("opacity-0", "-translate-y-2");
  els.cartToast.classList.add("opacity-100", "translate-y-0");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.cartToast.classList.remove("opacity-100", "translate-y-0");
    els.cartToast.classList.add("opacity-0", "-translate-y-2");
  }, 1800);
}

function initScrollReveals() {
  const targets = document.querySelectorAll(".qasr-reveal");
  if (!targets.length) return;
  if (typeof IntersectionObserver === "undefined") {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );
  targets.forEach((el) => observer.observe(el));
}

function isDark() {
  return currentTheme === "dark";
}

function applyTheme() {
  const dark = isDark();

  els.themeIcon.textContent = dark ? "☀️" : "🌙";
  els.themeLabel.textContent = dark ? "Light" : "Dark";

  els.pageBody.className = dark
    ? "bg-[#0F0E0D] text-stone-100 min-h-screen flex flex-col transition-colors duration-300"
    : "bg-[#F7F5F0] text-stone-900 min-h-screen flex flex-col transition-colors duration-300";

  els.mainHeader.className = dark
    ? "sticky top-0 z-30 bg-[#0F0E0D]/95 backdrop-blur-md border-b border-stone-800 transition-colors duration-300"
    : "sticky top-0 z-30 bg-[#F7F5F0]/95 backdrop-blur-md border-b border-stone-200/90 transition-colors duration-300";

  els.navBrandName.className = dark
    ? "font-serif text-base sm:text-xl font-bold text-amber-400 tracking-tight truncate"
    : "font-serif text-base sm:text-xl font-bold text-stone-900 tracking-tight truncate";

  els.desktopNav.className = dark
    ? "hidden lg:flex items-center gap-7 text-xs font-semibold text-stone-300"
    : "hidden lg:flex items-center gap-7 text-xs font-semibold text-stone-600";

  els.themeToggleBtn.className = dark
    ? "px-2.5 sm:px-3 py-2 rounded-full border border-stone-700 bg-stone-900 text-amber-300 text-xs font-semibold flex items-center gap-1.5 qasr-press cursor-pointer"
    : "px-2.5 sm:px-3 py-2 rounded-full border border-stone-300 bg-white text-stone-800 text-xs font-semibold flex items-center gap-1.5 qasr-press cursor-pointer";

  els.navLoginBtn.className = dark
    ? "px-2.5 sm:px-3.5 py-2 rounded-full border border-stone-700 text-xs font-semibold text-stone-200 bg-stone-900 qasr-press"
    : "px-2.5 sm:px-3.5 py-2 rounded-full border border-stone-300 hover:border-[#1F4E3D] text-xs font-semibold text-stone-800 bg-white qasr-press";

  els.navSignupBtn.className = dark
    ? "hidden sm:inline-block px-3.5 py-2 rounded-full bg-stone-800 text-xs font-semibold text-amber-300 qasr-press"
    : "hidden sm:inline-block px-3.5 py-2 rounded-full bg-stone-200/80 hover:bg-stone-300/80 text-xs font-semibold text-stone-900 qasr-press";

  els.mobileSubBar.className = dark
    ? "sm:hidden border-t border-stone-800 bg-[#141210] px-3 py-2 flex items-center justify-between text-[11px] text-stone-300"
    : "sm:hidden border-t border-stone-200 bg-[#F1EEE7] px-3 py-2 flex items-center justify-between text-[11px] text-stone-700";

  els.heroSection.className = dark
    ? "bg-[#141210] border-b border-stone-800 py-10 sm:py-16 transition-colors duration-300"
    : "bg-[#F7F5F0] border-b border-stone-200/80 py-10 sm:py-16 transition-colors duration-300";

  els.heroTitle.className = dark
    ? "font-serif text-4xl sm:text-6xl font-bold leading-[1.08] tracking-tight text-white"
    : "font-serif text-4xl sm:text-6xl font-bold leading-[1.08] tracking-tight text-stone-900";

  els.heroDesc.className = dark
    ? "text-stone-300 text-sm sm:text-base leading-relaxed max-w-xl"
    : "text-stone-600 text-sm sm:text-base leading-relaxed max-w-xl";

  els.heroFloatingCard.className = dark
    ? "hidden sm:flex items-center gap-3 bg-stone-900 border border-stone-700 rounded-2xl px-4 py-3 shadow-xl absolute -bottom-4 left-6"
    : "hidden sm:flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-xl absolute -bottom-4 left-6";

  els.menuHeading.className = dark
    ? "font-serif text-3xl sm:text-4xl font-bold text-white"
    : "font-serif text-3xl sm:text-4xl font-bold text-stone-900";

  els.menuSubheading.className = dark
    ? "text-xs sm:text-sm text-stone-400"
    : "text-xs sm:text-sm text-stone-600";

  els.menuSearchInput.className = dark
    ? "w-full px-4 py-2 rounded-full bg-stone-900 border border-stone-700 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 transition"
    : "w-full px-4 py-2 rounded-full bg-white border border-stone-300 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#1F4E3D] transition";

  els.storySection.className = dark
    ? "bg-[#141210] border-t border-stone-800 py-14 sm:py-16 transition-colors duration-300"
    : "bg-white border-t border-stone-200 py-14 sm:py-16 transition-colors duration-300";

  els.storyHeading.className = dark
    ? "font-serif text-2xl sm:text-4xl font-bold text-white"
    : "font-serif text-2xl sm:text-4xl font-bold text-stone-900";

  els.storyBody.className = dark
    ? "text-stone-300 text-xs sm:text-sm leading-relaxed"
    : "text-stone-600 text-xs sm:text-sm leading-relaxed";

  const infoCard = dark
    ? "p-4 rounded-2xl bg-stone-900 border border-stone-800"
    : "p-4 rounded-2xl bg-[#F7F5F0] border border-stone-200/80";
  els.featureCard1.className = infoCard;
  els.featureCard2.className = infoCard;

  els.mainFooter.className = dark
    ? "bg-[#0A0908] text-stone-400 border-t border-stone-800 pb-20 sm:pb-0 transition-colors duration-300"
    : "bg-[#EFECE4] text-stone-700 border-t border-stone-300/80 pb-20 sm:pb-0 transition-colors duration-300";
}

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
        "<strong>Qasr-e-Dastarkhwan</strong><br>Gulgasht Colony, Multan, Punjab, Pakistan",
      )
      .openPopup();
  }

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
    els.userOrdersList.innerHTML = `<p class="text-xs text-stone-500 bg-[#F7F5F0] border border-stone-200 rounded-xl p-4">No orders placed under this account yet.</p>`;
    return;
  }

  els.userOrdersList.innerHTML = myOrders
    .map(
      (o) => `
      <div class="border border-stone-200 rounded-xl p-3.5 space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-bold text-[#1F4E3D]">#${o.orderId}</span>
          <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">${o.status}</span>
        </div>
        <p class="text-stone-600">${o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</p>
        <div class="flex items-center justify-between pt-1 border-t border-stone-100">
          <span class="font-bold text-stone-900">${formatPrice(o.total)}</span>
          <a href="./track-order.html?id=${encodeURIComponent(o.orderId)}" class="text-[#1F4E3D] font-semibold hover:underline">
            Track Live →
          </a>
        </div>
      </div>`,
    )
    .join("");
}

function renderBrand() {
  const settings = Store.getSettings();
  document.title = `${settings.restaurantName} | Fine Dining & Online Ordering`;
  els.navBrandName.textContent = settings.restaurantName;
  els.footerBrandTitle.textContent = settings.restaurantName;
  els.footerBrandText.textContent = `Serving signature grills, slow-simmered karahis, and fragrant biryanis in Gulgasht Colony, Multan, Punjab, Pakistan.`;

  const lastOrderId = localStorage.getItem("restro_last_order_id");
  const lastOrder = lastOrderId ? Store.getOrderById(lastOrderId) : null;
  const hasActive =
    lastOrder && !["Delivered", "Cancelled"].includes(lastOrder.status);
  els.activeOrderDot.classList.toggle("hidden", !hasActive);
  els.mobileOrderDot.classList.toggle("hidden", !hasActive);

  const currentUser = Auth.getCurrentUser();
  if (currentUser) {
    els.userProfileBtn.classList.remove("hidden");
    els.userProfileBtn.classList.add("flex");
    els.guestAuthButtons.classList.add("hidden");
    els.mobileSignupLink.textContent = `My Orders (${currentUser.name.split(" ")[0]})`;
    els.mobileSignupLink.href = "#profile";
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
    els.mobileSignupLink.textContent = "Create Account →";
    els.mobileSignupLink.href = "./auth.html?mode=signup";
  }
}

function renderCategories() {
  const dark = isDark();
  els.categoryFilters.innerHTML = CATEGORIES.map((cat) => {
    const active = selectedCategory === cat;
    const inactiveClass = dark
      ? "bg-stone-900 text-stone-300 border border-stone-800 hover:border-stone-600"
      : "bg-white text-stone-700 border border-stone-200 hover:border-[#1F4E3D] hover:text-[#1F4E3D]";
    return `
      <button type="button" data-category="${cat}"
        class="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 qasr-press cursor-pointer ${
          active ? "bg-[#1F4E3D] text-white shadow-xs" : inactiveClass
        }">
        ${cat}
      </button>
    `;
  }).join("");
}

function renderMenu() {
  const dark = isDark();
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
      <div class="col-span-full ${dark ? "bg-stone-900 border-stone-800 text-stone-400" : "bg-white border-stone-200 text-stone-500"} border rounded-2xl p-12 text-center qasr-card-in">
        No dishes found matching your selection.
      </div>
    `;
    return;
  }

  els.menuGrid.innerHTML = filtered
    .map((item, idx) => {
      const available = Boolean(item.inStock);
      const off = Number(item.offPercent || 0);
      const finalPrice = getEffectivePrice(item);
      const delay = Math.min(idx * 45, 320);

      const cardClasses = dark
        ? "qasr-card-in group bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition flex flex-col"
        : "qasr-card-in group bg-white border border-stone-200/90 hover:border-stone-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col";

      const titleClasses = dark
        ? "font-serif text-base font-bold text-white leading-snug"
        : "font-serif text-base font-bold text-stone-900 leading-snug";

      const priceClasses = dark
        ? "text-sm font-bold text-amber-400"
        : "text-sm font-bold text-stone-900";

      const descClasses = dark
        ? "text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed"
        : "text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed";

      const addBtnClasses = available
        ? dark
          ? "flex-1 py-2 px-2.5 rounded-lg text-[11px] font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 qasr-press cursor-pointer"
          : "flex-1 py-2 px-2.5 rounded-lg text-[11px] font-semibold bg-[#F7F5F0] hover:bg-stone-200/80 text-stone-800 border border-stone-200 qasr-press cursor-pointer"
        : "flex-1 py-2 px-2.5 rounded-lg text-[11px] font-semibold bg-stone-200/50 text-stone-400 cursor-not-allowed";

      const orderNowClasses = available
        ? "flex-1 py-2 px-2.5 rounded-lg text-[11px] font-semibold bg-[#1F4E3D] hover:bg-[#163B2E] text-white qasr-press cursor-pointer"
        : "flex-1 py-2 px-2.5 rounded-lg text-[11px] font-semibold bg-stone-200/50 text-stone-400 cursor-not-allowed";

      const badgeLabel = !available
        ? "Sold Out"
        : off > 0
          ? `${off}% OFF`
          : item.featured
            ? "Bestseller"
            : item.category;

      return `
        <article class="${cardClasses}" style="animation-delay: ${delay}ms;">
          <div class="relative h-44 bg-stone-100 overflow-hidden">
            <img src="${item.image}" alt="${item.name}" loading="lazy"
              class="w-full h-full object-cover group-hover:scale-104 transition duration-500 ${available ? "" : "grayscale opacity-50"}" />
            <span class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-stone-800 shadow-xs">
              ${badgeLabel}
            </span>
          </div>

          <div class="p-4 flex-1 flex flex-col justify-between gap-3">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-[#C86428]">${item.category}</p>
              <h3 class="${titleClasses} mt-0.5">${item.name}</h3>
              <p class="${descClasses}">${item.description}</p>
            </div>

            <div class="space-y-2.5 pt-1">
              <div class="flex items-center justify-between text-xs">
                <div>
                  <span class="${priceClasses}">${formatPrice(finalPrice)}</span>
                  ${
                    off > 0
                      ? `<span class="text-[11px] line-through text-stone-400 ml-1">${formatPrice(item.price)}</span>`
                      : ""
                  }
                </div>
                <span class="text-[11px] text-stone-500">${item.prepTime}m${item.spiceLevel ? ` • ${item.spiceLevel}` : ""}</span>
              </div>

              <div class="flex items-center gap-2">
                <button type="button" data-add-to-cart="${item.id}" ${available ? "" : "disabled"} class="${addBtnClasses}">
                  ${available ? "+ Add to bag" : "Sold out"}
                </button>
                <button type="button" data-order-now="${item.id}" ${available ? "" : "disabled"} class="${orderNowClasses}">
                  ${available ? "Order Now" : "Unavailable"}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDrawer() {
  const fullCartSummary = Store.getCartSummary();
  const isDirectSingle = Boolean(directOrderItem);
  const activeSummary = isDirectSingle
    ? Store.computeSummaryForItems([directOrderItem])
    : fullCartSummary;

  els.cartCountBadge.textContent = fullCartSummary.itemCount;
  els.drawerHeading.textContent = isDirectSingle
    ? "Order This Dish"
    : "Your Cart";

  if (isDirectSingle && fullCartSummary.itemCount > 0) {
    els.showFullCartBtn.classList.remove("hidden");
    els.directShowCartCount.textContent = fullCartSummary.itemCount;
  } else {
    els.showFullCartBtn.classList.add("hidden");
  }

  els.cartEtaText.textContent =
    activeSummary.items.length > 0
      ? `Est. delivery time: ~${activeSummary.estDeliveryMins} mins`
      : "Add items to see delivery estimate";

  els.cartSubtotal.textContent = formatPrice(activeSummary.subtotal);
  els.cartDeliveryFee.textContent = formatPrice(activeSummary.deliveryFee);
  els.cartGrandTotal.textContent = formatPrice(activeSummary.total);
  els.placeOrderBtn.disabled = activeSummary.items.length === 0;

  els.mobileCartCount.textContent = fullCartSummary.itemCount;
  els.mobileCartTotal.textContent = formatPrice(fullCartSummary.total);
  els.mobileOrderBar.classList.toggle(
    "hidden",
    fullCartSummary.itemCount === 0,
  );

  if (activeSummary.items.length === 0) {
    els.cartItemsContainer.innerHTML = `
      <div class="py-8 text-center text-stone-500 text-sm">
        Your bag is empty. Pick a dish from the menu to get started.
      </div>
    `;
    return;
  }

  els.cartItemsContainer.innerHTML = activeSummary.items
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
            class="w-8 h-8 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-sm qasr-press cursor-pointer">−</button>
          <span class="w-5 text-center text-sm font-semibold">${item.qty}</span>
          <button type="button" data-qty-delta="1" data-item-id="${item.id}"
            class="w-8 h-8 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-sm qasr-press cursor-pointer">+</button>
        </div>
      </div>
    `,
    )
    .join("");
}

function openDrawer({ singleProduct = null } = {}) {
  directOrderItem = singleProduct
    ? Store.buildLineItemFromProduct(singleProduct, 1)
    : null;
  renderDrawer();
  els.cartBackdrop.classList.remove("hidden");
  els.cartDrawer.classList.remove("translate-x-full");
  setTimeout(() => {
    if (checkoutMap) checkoutMap.invalidateSize();
  }, 260);
}

function closeDrawer() {
  els.cartDrawer.classList.add("translate-x-full");
  setTimeout(() => {
    els.cartBackdrop.classList.add("hidden");
    directOrderItem = null;
  }, 250);
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

els.themeToggleBtn.addEventListener("click", () => {
  currentTheme = isDark() ? "light" : "dark";
  localStorage.setItem(THEME_KEY, currentTheme);
  applyTheme();
  renderCategories();
  renderMenu();
});

els.mobileSignupLink.addEventListener("click", (e) => {
  if (els.mobileSignupLink.getAttribute("href") === "#profile") {
    e.preventDefault();
    openProfile();
  }
});

els.openCartBtn.addEventListener("click", () =>
  openDrawer({ singleProduct: null }),
);
els.mobileOpenCartBtn.addEventListener("click", () =>
  openDrawer({ singleProduct: null }),
);
els.showFullCartBtn.addEventListener("click", () => {
  directOrderItem = null;
  renderDrawer();
});
els.closeCartBtn.addEventListener("click", closeDrawer);
els.cartBackdrop.addEventListener("click", closeDrawer);

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
  if (addBtn) {
    const product = Store.getMenu().find(
      (m) => m.id === addBtn.dataset.addToCart,
    );
    const added = Store.addToCart(addBtn.dataset.addToCart);
    if (added) {
      directOrderItem = null;
      renderDrawer();
      showCartToast(`Added "${product ? product.name : "dish"}" to bag`);
    }
    return;
  }

  const orderNowBtn = e.target.closest("[data-order-now]");
  if (orderNowBtn) {
    const product = Store.getMenu().find(
      (m) => m.id === orderNowBtn.dataset.orderNow,
    );
    if (product && product.inStock) {
      openDrawer({ singleProduct: product });
    }
  }
});

els.cartItemsContainer.addEventListener("click", (e) => {
  const qtyBtn = e.target.closest("[data-qty-delta]");
  if (!qtyBtn) return;
  const delta = Number(qtyBtn.dataset.qtyDelta);
  const itemId = qtyBtn.dataset.itemId;

  if (directOrderItem && directOrderItem.id === itemId) {
    const nextQty = directOrderItem.qty + delta;
    directOrderItem = nextQty > 0 ? { ...directOrderItem, qty: nextQty } : null;
    renderDrawer();
  } else {
    Store.updateCartQty(itemId, delta);
    renderDrawer();
  }
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
  const isDirectSingle = Boolean(directOrderItem);

  const order = await Store.createOrder({
    customerName: nameCheck.value,
    phone: phoneCheck.value,
    address: addrCheck.value,
    coords: selectedCoords,
    notes: document.getElementById("custNotes").value.trim(),
    userEmail: currentUser ? currentUser.email : "",
    customItems: isDirectSingle ? [directOrderItem] : null,
    clearMainCart: !isDirectSingle,
  });

  if (!order) return;

  directOrderItem = null;
  const waUrl = Store.buildWhatsAppURL(order);
  window.open(waUrl, "_blank", "noopener,noreferrer");

  els.orderSuccessDetails.textContent = `Order #${order.orderId} (${formatPrice(order.total)}) created. Est. delivery: ~${order.estDeliveryMins} mins.`;
  els.whatsappConfirmLink.href = waUrl;
  els.trackCreatedOrderLink.href = `./track-order.html?id=${encodeURIComponent(order.orderId)}`;
  els.orderSuccessBox.classList.remove("hidden");
  els.checkoutForm.reset();

  renderBrand();
  renderDrawer();
});

function refreshAll() {
  applyTheme();
  renderBrand();
  renderCategories();
  renderMenu();
  renderDrawer();
}

window.addEventListener("storage", refreshAll);
window.addEventListener("restro:updated", refreshAll);

initMaps();
initScrollReveals();
refreshAll();
