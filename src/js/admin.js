// src/js/admin.js
import { Store } from './store.js';

if (sessionStorage.getItem('restro_admin_auth') !== 'true') {
  window.location.href = './login.html';
}

const STATUSES = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

const els = {
  brandTitle: document.getElementById('adminBrandTitle'),
  logoutBtn: document.getElementById('logoutBtn'),
  tabs: document.querySelectorAll('.admin-tab'),
  panels: document.querySelectorAll('.tab-panel'),
  pendingBadge: document.getElementById('pendingBadge'),
  statRevenue: document.getElementById('statRevenue'),
  statOrders: document.getElementById('statOrders'),
  statMenuCount: document.getElementById('statMenuCount'),
  statTopDish: document.getElementById('statTopDish'),
  recentOrdersList: document.getElementById('recentOrdersList'),
  addDishForm: document.getElementById('addDishForm'),
  adminMenuTable: document.getElementById('adminMenuTable'),
  adminOrdersContainer: document.getElementById('adminOrdersContainer'),
  settingsForm: document.getElementById('settingsForm'),
  settingsSavedMsg: document.getElementById('settingsSavedMsg'),
  resetDemoBtn: document.getElementById('resetDemoBtn'),
};

function formatPrice(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

function renderAll() {
  const settings = Store.getSettings();
  const menu = Store.getMenu();
  const orders = Store.getOrders();

  els.brandTitle.textContent = `${settings.restaurantName} — Admin`;

  // Pending / Active badge
  const activeCount = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)).length;
  els.pendingBadge.textContent = activeCount;

  // Stats
  const validOrders = orders.filter((o) => o.status !== 'Cancelled');
  const revenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  els.statRevenue.textContent = formatPrice(revenue);
  els.statOrders.textContent = orders.length;
  els.statMenuCount.textContent = `${menu.filter((m) => m.inStock).length} / ${menu.length}`;

  // Top dish calculation
  const dishCounts = {};
  validOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      dishCounts[item.name] = (dishCounts[item.name] || 0) + item.qty;
    });
  });
  const topDishEntry = Object.entries(dishCounts).sort((a, b) => b[1] - a[1])[0];
  els.statTopDish.textContent = topDishEntry ? `${topDishEntry[0]} (${topDishEntry[1]})` : 'No orders yet';

  // Recent orders snapshot
  if (orders.length === 0) {
    els.recentOrdersList.innerHTML = `<p class="py-4 text-stone-400">No customer orders placed yet.</p>`;
  } else {
    els.recentOrdersList.innerHTML = orders
      .slice(0, 5)
      .map(
        (o) => `
        <div class="py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="font-semibold text-amber-400">#${o.orderId}</span>
            <span class="text-stone-300 ml-2">${o.customerName}</span>
            <span class="text-stone-500 text-xs ml-2">(${o.items.length} items)</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs px-2.5 py-1 rounded-full bg-stone-800 text-stone-200">${o.status}</span>
            <span class="font-semibold text-white">${formatPrice(o.total)}</span>
          </div>
        </div>`
      )
      .join('');
  }

  // Menu table
  els.adminMenuTable.innerHTML = menu
    .map(
      (item) => `
      <tr class="hover:bg-stone-800/40">
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${item.image}" alt="${item.name}" class="w-11 h-11 rounded-lg object-cover bg-stone-800" />
            <div>
              <p class="font-semibold text-white">${item.name}</p>
              ${item.featured ? '<span class="text-[11px] text-amber-400">★ Featured</span>' : ''}
            </div>
          </div>
        </td>
        <td class="py-3 px-4 text-stone-300">${item.category}</td>
        <td class="py-3 px-4 font-medium text-amber-400">${formatPrice(item.price)}</td>
        <td class="py-3 px-4 text-stone-400">${item.prepTime}m</td>
        <td class="py-3 px-4">
          <button
            data-toggle-stock="${item.id}"
            class="px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${
              item.inStock
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }"
          >
            ${item.inStock ? 'In Stock' : 'Out of Stock'}
          </button>
        </td>
        <td class="py-3 px-4 text-right">
          <button
            data-delete-dish="${item.id}"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 cursor-pointer"
          >
            Delete
          </button>
        </td>
      </tr>`
    )
    .join('');

  // Live orders list
  if (orders.length === 0) {
    els.adminOrdersContainer.innerHTML = `<div class="bg-stone-900 border border-stone-800 rounded-2xl p-8 text-center text-stone-400">No orders yet. Place a test order from the User Storefront to see it appear here live.</div>`;
  } else {
    els.adminOrdersContainer.innerHTML = orders
      .map(
        (order) => `
        <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2.5">
                <span class="text-base font-bold text-amber-400">#${order.orderId}</span>
                <span class="text-xs text-stone-400">${new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>
              <p class="text-sm font-medium text-white mt-1">${order.customerName} • <span class="text-stone-400">${order.phone}</span></p>
              <p class="text-xs text-stone-400 mt-0.5">${order.address}</p>
            </div>

            <div class="flex items-center gap-3">
              <label class="text-xs text-stone-400">Status:</label>
              <select
                data-order-status="${order.orderId}"
                class="px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
              >
                ${STATUSES.map(
                  (st) => `<option value="${st}" ${order.status === st ? 'selected' : ''}>${st}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          <div class="bg-stone-950/70 rounded-xl p-3 text-xs space-y-1">
            ${order.items
              .map(
                (i) => `<div class="flex justify-between text-stone-300">
                  <span>${i.qty}x ${i.name}</span>
                  <span>${formatPrice(i.price * i.qty)}</span>
                </div>`
              )
              .join('')}
            <div class="pt-2 mt-2 border-t border-stone-800 flex justify-between font-bold text-white">
              <span>Total (incl. ${formatPrice(order.deliveryFee)} delivery)</span>
              <span class="text-amber-400">${formatPrice(order.total)}</span>
            </div>
          </div>
        </div>`
      )
      .join('');
  }

  // Sync settings form values
  document.getElementById('setBrandName').value = settings.restaurantName;
  document.getElementById('setWhatsapp').value = settings.whatsappNumber;
  document.getElementById('setDeliveryFee').value = settings.deliveryFee;
  document.getElementById('setBaseMins').value = settings.baseDeliveryMins;
}

// Tab switching
els.tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    els.tabs.forEach((t) => {
      t.classList.remove('border-amber-500', 'text-amber-400');
      t.classList.add('border-transparent', 'text-stone-400');
    });
    tab.classList.remove('border-transparent', 'text-stone-400');
    tab.classList.add('border-amber-500', 'text-amber-400');

    els.panels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.id !== `tab-${target}`);
    });
  });
});

// Add menu item
els.addDishForm.addEventListener('submit', (e) => {
  e.preventDefault();
  Store.addMenuItem({
    name: document.getElementById('dishName').value.trim(),
    category: document.getElementById('dishCategory').value,
    price: document.getElementById('dishPrice').value,
    prepTime: document.getElementById('dishPrep').value,
    featured: document.getElementById('dishFeatured').checked,
    image: document.getElementById('dishImage').value.trim(),
    description: document.getElementById('dishDesc').value.trim(),
  });
  els.addDishForm.reset();
  renderAll();
});

// Stock toggle & delete dish
els.adminMenuTable.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('[data-toggle-stock]');
  if (toggleBtn) {
    const id = toggleBtn.dataset.toggleStock;
    const item = Store.getMenu().find((m) => m.id === id);
    if (item) {
      Store.updateMenuItem(id, { inStock: !item.inStock });
      renderAll();
    }
    return;
  }

  const delBtn = e.target.closest('[data-delete-dish]');
  if (delBtn) {
    Store.deleteMenuItem(delBtn.dataset.deleteDish);
    renderAll();
  }
});

// Order status update
els.adminOrdersContainer.addEventListener('change', (e) => {
  const select = e.target.closest('[data-order-status]');
  if (select) {
    Store.updateOrderStatus(select.dataset.orderStatus, select.value);
    renderAll();
  }
});

// Settings save
els.settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  Store.updateSettings({
    restaurantName: document.getElementById('setBrandName').value.trim(),
    whatsappNumber: document.getElementById('setWhatsapp').value.trim(),
    deliveryFee: Number(document.getElementById('setDeliveryFee').value),
    baseDeliveryMins: Number(document.getElementById('setBaseMins').value),
  });
  els.settingsSavedMsg.classList.remove('hidden');
  setTimeout(() => els.settingsSavedMsg.classList.add('hidden'), 2500);
  renderAll();
});

// Reset demo data
els.resetDemoBtn.addEventListener('click', () => {
  Store.resetAllData();
  renderAll();
});

// Logout
els.logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('restro_admin_auth');
  window.location.href = './login.html';
});

// Live updates across tabs & same tab
window.addEventListener('storage', renderAll);
window.addEventListener('restro:updated', renderAll);

renderAll();