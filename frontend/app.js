const API = 'http://localhost:5000/api';
let itemCache = [];
let cart = [];
let editingTypeId = null;
let editingPurchaseId = null;
let editingPurchaseItems = [];

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  if (id === 'items') loadItems();
  if (id === 'types') loadTypes();
  if (id === 'purchase') loadPurchaseItems();
  if (id === 'purchases') loadPurchases();
}

function msg(id, text) {
  document.getElementById(id).textContent = text;
}

function formatDate(d) {
  return d ? String(d).slice(0, 10) : '';
}


async function loadTypes() {
  try {
    const types = await api('/item-types');
    document.getElementById('typesList').innerHTML = types.map(t => `
      <li class="type-row">
        <span>${t.type_name}</span>
        <span>
          <button type="button" onclick="editType(${t.id}, '${escapeHtml(t.type_name)}')">Edit</button>
          <button type="button" onclick="deleteType(${t.id})">Delete</button>
        </span>
      </li>
    `).join('');

    document.getElementById('itemType').innerHTML =
      '<option value="">Select type</option>' +
      types.map(t => `<option value="${t.id}">${t.type_name}</option>`).join('');

    if (editingTypeId) {
      document.getElementById('typeName').value =
        types.find(t => t.id === editingTypeId)?.type_name || '';
    }
  } catch (e) {
    msg('typeMessage', e.message);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function editType(id, name) {
  editingTypeId = id;
  document.getElementById('typeName').value = name;
  document.getElementById('typeSubmit').textContent = 'Update Type';
  document.getElementById('typeCancel').classList.remove('hidden');
  msg('typeMessage', `Editing item type #${id}`);
}

function cancelTypeEdit() {
  editingTypeId = null;
  document.getElementById('typeForm').reset();
  document.getElementById('typeSubmit').textContent = 'Add Type';
  document.getElementById('typeCancel').classList.add('hidden');
  msg('typeMessage', '');
}

async function deleteType(id) {
  if (!confirm('Delete this item type?')) return;
  try {
    await api('/item-types/' + id, { method: 'DELETE' });
    msg('typeMessage', 'Item type deleted');
    loadTypes();
  } catch (e) {
    msg('typeMessage', e.message);
  }
}

document.getElementById('typeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const typeName = document.getElementById('typeName').value.trim();
  if (!typeName) return;

  try {
    if (editingTypeId) {
      await api('/item-types/' + editingTypeId, {
        method: 'PUT',
        body: JSON.stringify({ type_name: typeName })
      });
      msg('typeMessage', 'Item type updated');
    } else {
      await api('/item-types', {
        method: 'POST',
        body: JSON.stringify({ type_name: typeName })
      });
      msg('typeMessage', 'Item type created');
    }
    cancelTypeEdit();
    loadTypes();
    loadItems();
  } catch (err) {
    msg('typeMessage', err.message);
  }
});


async function loadItems() {
  try {
    itemCache = await api('/items');
    document.getElementById('itemsBody').innerHTML = itemCache.map(i => `
      <tr>
        <td>${i.id}</td>
        <td>${i.name}</td>
        <td>${i.type_name}</td>
        <td>${formatDate(i.purchase_date)}</td>
        <td>${i.stock_available}</td>
        <td>${i.availability}</td>
        <td>${i.active ? 'Active' : 'Inactive'}</td>
        <td>
          <button onclick="editItem(${i.id})">Edit</button>
          <button onclick="deleteItem(${i.id})">Delete</button>
        </td>
      </tr>
    `).join('');
    loadTypes();
  } catch (e) {
    msg('itemMessage', e.message);
  }
}

document.getElementById('itemForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('itemId').value;
  const body = {
    name: document.getElementById('itemName').value,
    item_type_id: Number(document.getElementById('itemType').value),
    purchase_date: document.getElementById('purchaseDate').value,
    stock_available: Number(document.getElementById('stock').value),
    active: Number(document.getElementById('active').value) === 1
  };

  try {
    await api(id ? `/items/${id}` : '/items', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(body)
    });
    msg('itemMessage', id ? 'Item updated' : 'Item created');
    resetItemForm();
    loadItems();
  } catch (err) {
    msg('itemMessage', err.message);
  }
});

async function editItem(id) {
  try {
    const i = await api('/items/' + id);
    document.getElementById('itemId').value = i.id;
    document.getElementById('itemName').value = i.name;
    document.getElementById('itemType').value = i.item_type_id;
    document.getElementById('purchaseDate').value = formatDate(i.purchase_date);
    document.getElementById('stock').value = i.stock_available;
    document.getElementById('active').value = i.active ? 1 : 0;
    msg('itemMessage', `Editing item #${id}`);
    showSection('items');
  } catch (e) {
    msg('itemMessage', e.message);
  }
}

async function deleteItem(id) {
  if (!confirm('Delete this item?')) return;
  try {
    await api('/items/' + id, { method: 'DELETE' });
    loadItems();
    msg('itemMessage', 'Item deleted');
  } catch (e) {
    msg('itemMessage', e.message);
  }
}

function resetItemForm() {
  document.getElementById('itemForm').reset();
  document.getElementById('itemId').value = '';
}


async function loadPurchaseItems() {
  try {
    itemCache = await api('/items');
    document.getElementById('purchaseItem').innerHTML =
      '<option value="">Select active item</option>' +
      itemCache.filter(i => i.active && i.stock_available > 0)
        .map(i => `<option value="${i.id}">${i.name} (stock: ${i.stock_available})</option>`)
        .join('');
  } catch (e) {
    msg('purchaseMessage', e.message);
  }
}

function addLine() {
  const id = Number(document.getElementById('purchaseItem').value);
  const quantity = Number(document.getElementById('quantity').value);

  if (!id || !Number.isInteger(quantity) || quantity <= 0) {
    msg('purchaseMessage', 'Select an item and enter a positive quantity');
    return;
  }
  if (cart.some(x => x.item_id === id)) {
    msg('purchaseMessage', 'Duplicate item is not allowed');
    return;
  }

  const item = itemCache.find(x => x.id === id);
  if (quantity > item.stock_available) {
    msg('purchaseMessage', `Only ${item.stock_available} available`);
    return;
  }

  cart.push({ item_id: id, quantity, name: item.name });
  document.getElementById('quantity').value = '';
  renderCart();
}

function renderCart() {
  document.getElementById('cart').innerHTML = cart.map((x, i) =>
    `<li class="cart-line">${x.name} - ${x.quantity}<button type="button" onclick="removeLine(${i})">Remove</button></li>`
  ).join('');
}

function removeLine(i) {
  cart.splice(i, 1);
  renderCart();
}

document.getElementById('purchaseForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!cart.length) {
    msg('purchaseMessage', 'Add at least one item');
    return;
  }

  try {
    const result = await api('/purchases', {
      method: 'POST',
      body: JSON.stringify({
        order_id: document.getElementById('orderId').value,
        purchase_date: document.getElementById('purchaseDate2').value,
        items: cart.map(x => ({ item_id: x.item_id, quantity: x.quantity }))
      })
    });
    msg('purchaseMessage', `${result.order_id} created successfully`);
    cart = [];
    renderCart();
    e.target.reset();
    loadPurchaseItems();
    loadItems();
  } catch (err) {
    msg('purchaseMessage', err.message);
  }
});


async function loadPurchases() {
  try {
    const rows = await api('/purchases');
    document.getElementById('purchasesBody').innerHTML = rows.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.order_id}</td>
        <td>${formatDate(p.purchase_date)}</td>
        <td>${p.item_count}</td>
        <td>${p.total_quantity}</td>
        <td>
          <button onclick="showPurchase(${p.id})">View</button>
          <button onclick="editPurchase(${p.id})">Edit</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    document.getElementById('purchaseDetails').textContent = e.message;
  }
}

async function showPurchase(id) {
  try {
    const p = await api('/purchases/' + id);
    document.getElementById('purchaseDetails').innerHTML = `
      <h3>${p.order_id}</h3>
      <p>Date: ${formatDate(p.purchase_date)}</p>
      <table>
        <tr><th>Item</th><th>Type</th><th>Quantity</th><th>Current Stock</th></tr>
        ${p.items.map(i => `<tr><td>${i.item_name}</td><td>${i.type_name}</td><td>${i.quantity}</td><td>${i.stock_available}</td></tr>`).join('')}
      </table>
    `;
  } catch (e) {
    document.getElementById('purchaseDetails').textContent = e.message;
  }
}

async function editPurchase(id) {
  try {
    const p = await api('/purchases/' + id);
    editingPurchaseId = id;
    editingPurchaseItems = p.items.map(i => ({
      item_id: Number(i.item_id),
      quantity: Number(i.quantity),
      name: i.item_name,
      stock_available: Number(i.stock_available)
    }));

    document.getElementById('editPurchaseId').textContent = p.order_id;
    document.getElementById('editPurchaseDate').value = formatDate(p.purchase_date);
    document.getElementById('editPurchaseLines').innerHTML = editingPurchaseItems.map((x, index) => `
      <div class="edit-line">
        <span>${x.name}</span>
        <input type="number" min="1" value="${x.quantity}" onchange="changePurchaseQty(${index}, this.value)">
      </div>
    `).join('');
    document.getElementById('purchaseEditBox').classList.remove('hidden');
  } catch (e) {
    msg('purchaseEditMessage', e.message);
  }
}

function changePurchaseQty(index, value) {
  const qty = Number(value);
  if (Number.isInteger(qty) && qty > 0) {
    editingPurchaseItems[index].quantity = qty;
  }
}

function cancelPurchaseEdit() {
  editingPurchaseId = null;
  editingPurchaseItems = [];
  document.getElementById('purchaseEditBox').classList.add('hidden');
  msg('purchaseEditMessage', '');
}

document.getElementById('purchaseEditForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!editingPurchaseId) return;

  try {
    await api('/purchases/' + editingPurchaseId, {
      method: 'PUT',
      body: JSON.stringify({
        purchase_date: document.getElementById('editPurchaseDate').value,
        items: editingPurchaseItems.map(x => ({ item_id: x.item_id, quantity: x.quantity }))
      })
    });
    msg('purchaseEditMessage', 'Purchase updated successfully and stock adjusted');
    cancelPurchaseEdit();
    loadPurchases();
    loadItems();
  } catch (e) {
    msg('purchaseEditMessage', e.message);
  }
});

showSection('items');
