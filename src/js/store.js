// src/js/store.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA973T6GYQl9yk4IUozCbmfSfhRZaPot5Q",
  authDomain: "zaiqa-restaurant-system.firebaseapp.com",
  databaseURL:
    "https://zaiqa-restaurant-system-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "zaiqa-restaurant-system",
  storageBucket: "zaiqa-restaurant-system.firebasestorage.app",
  messagingSenderId: "160246151392",
  appId: "1:160246151392:web:172cfd056b22f9fa717885",
  measurementId: "G-20H0SPY3Z7",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const CART_KEY = "restro_cart_v1";
const LAST_ORDER_KEY = "restro_last_order_id";

const DEFAULT_SETTINGS = {
  restaurantName: "Qasr-e-Dastarkhwan",
  whatsappNumber: "923001234567",
  deliveryPercent: 5,
  baseDeliveryMins: 25,
  adminPin: "admin123",
};

const DEFAULT_ADMINS = {
  adm_primary: {
    id: "adm_primary",
    name: "Primary Admin",
    email: "danishfarooq.cs@gmail.com",
    password: "zaiqateamemerson@786",
    role: "Owner",
  },
};

const DEFAULT_MENU = {
  item_101: {
    id: "item_101",
    name: "Smoked Charcoal Seekh Kebab",
    category: "Starters",
    price: 850,
    offPercent: 10,
    spiceLevel: "Medium",
    prepTime: 15,
    inStock: true,
    featured: true,
    description:
      "Hand-minced spiced beef skewers grilled over live charcoal, served with mint raita.",
    image:
      "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80",
  },
  item_102: {
    id: "item_102",
    name: "Saffron Butter Chicken Karahi",
    category: "Mains",
    price: 1650,
    offPercent: 0,
    spiceLevel: "Mild",
    prepTime: 25,
    inStock: true,
    featured: true,
    description:
      "Tender chicken simmered in rich heirloom tomato gravy with Kashmiri saffron and butter.",
    image:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80",
  },
  item_103: {
    id: "item_103",
    name: "Mutton Dum Biryani (Special)",
    category: "Mains",
    price: 1450,
    offPercent: 15,
    spiceLevel: "Spicy",
    prepTime: 20,
    inStock: true,
    featured: true,
    description:
      "Aged basmati rice layered with slow-cooked spiced mutton, caramelized onions, and kewra.",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
  },
};

const state = {
  menu: [],
  orders: [],
  admins: [],
  settings: { ...DEFAULT_SETTINGS },
  initialized: false,
};

function notify() {
  window.dispatchEvent(new Event("restro:updated"));
}

export function getEffectivePrice(item) {
  const base = Number(item.price || 0);
  const off = Math.min(90, Math.max(0, Number(item.offPercent || 0)));
  return Math.round(base * (1 - off / 100));
}

function startRealtimeListeners() {
  if (state.initialized) return;
  state.initialized = true;

  onValue(ref(db, "settings"), (snap) => {
    const val = snap.val();
    if (val) {
      state.settings = { ...DEFAULT_SETTINGS, ...val };
    } else {
      set(ref(db, "settings"), DEFAULT_SETTINGS);
      state.settings = { ...DEFAULT_SETTINGS };
    }
    notify();
  });

  onValue(ref(db, "admins"), (snap) => {
    const val = snap.val();
    if (val) {
      state.admins = Object.values(val);
    } else {
      set(ref(db, "admins"), DEFAULT_ADMINS);
      state.admins = Object.values(DEFAULT_ADMINS);
    }
    notify();
  });

  onValue(ref(db, "menu"), (snap) => {
    const val = snap.val();
    if (val) {
      state.menu = Object.values(val);
    } else {
      set(ref(db, "menu"), DEFAULT_MENU);
      state.menu = Object.values(DEFAULT_MENU);
    }
    notify();
  });

  onValue(ref(db, "orders"), (snap) => {
    const val = snap.val();
    state.orders = val
      ? Object.values(val).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        )
      : [];
    notify();
  });
}

export const Store = {
  init() {
    startRealtimeListeners();
    if (!localStorage.getItem(CART_KEY)) {
      localStorage.setItem(CART_KEY, JSON.stringify([]));
    }
  },

  getSettings() {
    this.init();
    return state.settings;
  },

  async updateSettings(newSettings) {
    this.init();
    const updated = { ...state.settings, ...newSettings };
    state.settings = updated;
    await update(ref(db, "settings"), newSettings);
    notify();
    return updated;
  },

  getAdmins() {
    this.init();
    return state.admins;
  },

  async addAdmin(adminObj) {
    this.init();
    await set(ref(db, `admins/${adminObj.id}`), adminObj);
    if (!state.admins.some((a) => a.id === adminObj.id)) {
      state.admins = [...state.admins, adminObj];
    }
    notify();
    return adminObj;
  },

  async updateAdmin(id, updates) {
    this.init();
    await update(ref(db, `admins/${id}`), updates);
    state.admins = state.admins.map((a) =>
      a.id === id ? { ...a, ...updates } : a,
    );
    notify();
  },

  async deleteAdmin(id) {
    this.init();
    await remove(ref(db, `admins/${id}`));
    state.admins = state.admins.filter((a) => a.id !== id);
    notify();
  },

  getMenu() {
    this.init();
    return state.menu;
  },

  async addMenuItem(item) {
    this.init();
    const id = "item_" + Date.now();
    const newItem = {
      id,
      name: item.name,
      category: item.category,
      price: Number(item.price),
      offPercent: Math.min(90, Math.max(0, Number(item.offPercent) || 0)),
      spiceLevel: item.spiceLevel || "Regular",
      prepTime: Number(item.prepTime) || 15,
      inStock: item.inStock !== false,
      featured: Boolean(item.featured),
      description: item.description || "",
      image:
        item.image ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    };
    await set(ref(db, `menu/${id}`), newItem);
    return newItem;
  },

  async updateMenuItem(id, updates) {
    this.init();
    await update(ref(db, `menu/${id}`), updates);
  },

  async deleteMenuItem(id) {
    this.init();
    await remove(ref(db, `menu/${id}`));
    const cart = this.getCart().filter((c) => c.id !== id);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    notify();
  },

  buildLineItemFromProduct(product, qty = 1) {
    return {
      id: product.id,
      name: product.name,
      price: getEffectivePrice(product),
      originalPrice: product.price,
      offPercent: product.offPercent || 0,
      prepTime: product.prepTime,
      image: product.image,
      qty,
    };
  },

  getCart() {
    this.init();
    const rawCart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    if (state.menu.length === 0) return rawCart;

    const validCart = rawCart
      .map((cartItem) => {
        const liveItem = state.menu.find((m) => m.id === cartItem.id);
        if (!liveItem || !liveItem.inStock) return null;
        return this.buildLineItemFromProduct(liveItem, cartItem.qty);
      })
      .filter(Boolean);

    if (validCart.length !== rawCart.length) {
      localStorage.setItem(CART_KEY, JSON.stringify(validCart));
    }
    return validCart;
  },

  addToCart(itemId) {
    const product = this.getMenu().find((m) => m.id === itemId);
    if (!product || !product.inStock) return false;

    const cart = this.getCart();
    const existing = cart.find((c) => c.id === itemId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push(this.buildLineItemFromProduct(product, 1));
    }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    notify();
    return true;
  },

  updateCartQty(itemId, delta) {
    const cart = this.getCart()
      .map((item) =>
        item.id === itemId ? { ...item, qty: item.qty + delta } : item,
      )
      .filter((item) => item.qty > 0);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    notify();
  },

  clearCart() {
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    notify();
  },

  computeSummaryForItems(items) {
    const settings = this.getSettings();
    const cleanItems = Array.isArray(items)
      ? items.filter((i) => i && i.qty > 0)
      : [];
    const subtotal = cleanItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    const deliveryFee = cleanItems.length > 0 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal + deliveryFee;
    const maxPrep =
      cleanItems.length > 0
        ? Math.max(...cleanItems.map((i) => i.prepTime || 15))
        : 0;
    const estDeliveryMins =
      cleanItems.length > 0
        ? maxPrep + Number(settings.baseDeliveryMins || 25)
        : 0;
    const itemCount = cleanItems.reduce((sum, item) => sum + item.qty, 0);

    return {
      items: cleanItems,
      subtotal,
      deliveryFee,
      total,
      estDeliveryMins,
      itemCount,
    };
  },

  getCartSummary() {
    const cart = this.getCart();
    const summary = this.computeSummaryForItems(cart);
    return { ...summary, cart };
  },

  getOrders() {
    this.init();
    return state.orders;
  },

  getOrdersByUserEmail(email) {
    if (!email) return [];
    const clean = email.trim().toLowerCase();
    return this.getOrders().filter(
      (o) => String(o.userEmail || "").toLowerCase() === clean,
    );
  },

  getOrderById(orderId) {
    return this.getOrders().find(
      (o) => o.orderId.toLowerCase() === orderId.toLowerCase(),
    );
  },

  async createOrder({
    customerName,
    phone,
    address,
    coords,
    notes,
    userEmail,
    customItems = null,
    clearMainCart = true,
  }) {
    this.init();
    const summary = customItems
      ? this.computeSummaryForItems(customItems)
      : this.getCartSummary();

    if (summary.items.length === 0) return null;

    const orderId = "ORD-" + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      orderId,
      customerName,
      phone,
      address,
      coords: coords || null,
      notes: notes || "",
      userEmail: userEmail || "",
      items: summary.items,
      subtotal: summary.subtotal,
      deliveryFee: summary.deliveryFee,
      total: summary.total,
      estDeliveryMins: summary.estDeliveryMins,
      status: "Pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(ref(db, `orders/${orderId}`), newOrder);
    localStorage.setItem(LAST_ORDER_KEY, orderId);
    if (clearMainCart && !customItems) {
      this.clearCart();
    }
    return newOrder;
  },

  async updateOrderStatus(orderId, newStatus) {
    this.init();
    await update(ref(db, `orders/${orderId}`), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  },

  buildWhatsAppURL(order) {
    const settings = this.getSettings();
    const cleanPhone = String(settings.whatsappNumber || "").replace(/\D/g, "");
    const itemsList = order.items
      .map((i) => `• ${i.qty}x ${i.name} (Rs. ${i.price * i.qty})`)
      .join("\n");
    const pinLink = order.coords
      ? `\n*Map Pin:* https://maps.google.com/?q=${order.coords.lat},${order.coords.lng}`
      : "";

    const message =
      `*NEW ORDER - ${settings.restaurantName}*\n` +
      `*Order ID:* ${order.orderId}\n` +
      `--------------------------\n` +
      `*Customer:* ${order.customerName}\n` +
      `*Phone:* ${order.phone}\n` +
      `*Address:* ${order.address}${pinLink}\n` +
      (order.notes ? `*Notes:* ${order.notes}\n` : "") +
      `--------------------------\n` +
      `*Items Ordered:*\n${itemsList}\n` +
      `--------------------------\n` +
      `Subtotal: Rs. ${order.subtotal}\n` +
      `Delivery Fee (5%): Rs. ${order.deliveryFee}\n` +
      `*Grand Total: Rs. ${order.total}*\n` +
      `Est. Delivery: ~${order.estDeliveryMins} mins`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  },

  async resetAllData() {
    this.init();
    await set(ref(db, "menu"), DEFAULT_MENU);
    await set(ref(db, "settings"), DEFAULT_SETTINGS);
    await set(ref(db, "admins"), DEFAULT_ADMINS);
    await remove(ref(db, "orders"));
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(LAST_ORDER_KEY);
    notify();
  },
};

Store.init();
