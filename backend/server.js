const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function bad(res, message) { return res.status(400).json({ error: message }); }

app.get('/api/health', (req, res) => res.json({ message: 'API is running' }));


app.get('/api/item-types', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM item_types ORDER BY type_name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to load item types' }); }
});

app.post('/api/item-types', async (req, res) => {
  const { type_name } = req.body;
  if (!type_name || !type_name.trim()) return bad(res, 'Item type is required');
  try {
    const [result] = await pool.execute('INSERT INTO item_types (type_name) VALUES (?)', [type_name.trim()]);
    res.status(201).json({ id: result.insertId, message: 'Item type created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Item type already exists' });
    res.status(500).json({ error: 'Failed to create item type' });
  }
});

app.put('/api/item-types/:id', async (req, res) => {
  const { type_name } = req.body;
  if (!type_name || !type_name.trim()) return bad(res, 'Item type is required');
  try {
    const [result] = await pool.execute('UPDATE item_types SET type_name=? WHERE id=?', [type_name.trim(), req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Item type not found' });
    res.json({ message: 'Item type updated' });
  } catch (err) { res.status(500).json({ error: 'Failed to update item type' }); }
});

app.delete('/api/item-types/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM item_types WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Item type not found' });
    res.json({ message: 'Item type deleted' });
  } catch (err) { res.status(409).json({ error: 'Cannot delete an item type that is in use' }); }
});

// ---------- ITEMS ----------
app.get('/api/items', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.id, i.name, it.type_name, i.item_type_id, i.purchase_date,
             i.stock_available, i.active,
             CASE WHEN i.stock_available > 0 THEN 'In Stock' ELSE 'Out of Stock' END AS availability
      FROM items i
      JOIN item_types it ON i.item_type_id = it.id
      ORDER BY i.id DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to load items' }); }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT i.*, it.type_name
      FROM items i JOIN item_types it ON i.item_type_id = it.id
      WHERE i.id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to load item' }); }
});

app.post('/api/items', async (req, res) => {
  const { name, item_type_id, purchase_date, stock_available, active } = req.body;
  if (!name || !name.trim()) return bad(res, 'Item name is required');
  if (!item_type_id) return bad(res, 'Item type is required');
  if (!purchase_date || !isValidDate(purchase_date)) return bad(res, 'Valid purchase date is required');
  if (!Number.isInteger(Number(stock_available)) || Number(stock_available) < 0) return bad(res, 'Stock cannot be negative');
  try {
    const [types] = await pool.execute('SELECT id FROM item_types WHERE id=?', [item_type_id]);
    if (!types.length) return bad(res, 'Invalid item type');
    const [result] = await pool.execute(
      'INSERT INTO items (name,item_type_id,purchase_date,stock_available,active) VALUES (?,?,?,?,?)',
      [name.trim(), item_type_id, purchase_date, Number(stock_available), active ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Item created' });
  } catch (err) { res.status(500).json({ error: 'Failed to create item' }); }
});

app.put('/api/items/:id', async (req, res) => {
  const { name, item_type_id, purchase_date, stock_available, active } = req.body;
  if (!name || !name.trim()) return bad(res, 'Item name is required');
  if (!item_type_id) return bad(res, 'Item type is required');
  if (!purchase_date || !isValidDate(purchase_date)) return bad(res, 'Valid purchase date is required');
  if (!Number.isInteger(Number(stock_available)) || Number(stock_available) < 0) return bad(res, 'Stock cannot be negative');
  try {
    const [types] = await pool.execute('SELECT id FROM item_types WHERE id=?', [item_type_id]);
    if (!types.length) return bad(res, 'Invalid item type');
    const [result] = await pool.execute(`UPDATE items SET name=?, item_type_id=?, purchase_date=?, stock_available=?, active=? WHERE id=?`,
      [name.trim(), item_type_id, purchase_date, Number(stock_available), active ? 1 : 0, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item updated' });
  } catch (err) { res.status(500).json({ error: 'Failed to update item' }); }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    const [used] = await pool.execute('SELECT id FROM purchase_items WHERE item_id=? LIMIT 1', [req.params.id]);
    if (used.length) return res.status(409).json({ error: 'Item is used in purchase history. Mark it inactive instead.' });
    const [result] = await pool.execute('DELETE FROM items WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete item' }); }
});


function validatePurchaseBody(body) {
  if (!body.purchase_date || !isValidDate(body.purchase_date)) return 'Valid purchase date is required';
  if (!Array.isArray(body.items) || body.items.length === 0) return 'Purchase must contain at least one item';
  const seen = new Set();
  for (const line of body.items) {
    const id = Number(line.item_id), qty = Number(line.quantity);
    if (!Number.isInteger(id) || id <= 0) return 'Invalid item ID';
    if (!Number.isInteger(qty) || qty <= 0) return 'Quantity must be greater than zero';
    if (seen.has(id)) return 'Duplicate items are not allowed in one order';
    seen.add(id);
  }
  return null;
}

app.post('/api/purchases', async (req, res) => {
  const validationError = validatePurchaseBody(req.body);
  if (validationError) return bad(res, validationError);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const orderId = req.body.order_id?.trim() || `PO-${Date.now()}`;
    const [orderExists] = await conn.execute('SELECT id FROM purchases WHERE order_id=?', [orderId]);
    if (orderExists.length) { await conn.rollback(); return res.status(409).json({ error: 'Order ID already exists' }); }

    for (const line of req.body.items) {
      const [rows] = await conn.execute('SELECT id, active, stock_available FROM items WHERE id=? FOR UPDATE', [line.item_id]);
      if (!rows.length) throw Object.assign(new Error('Item not found'), { status: 404 });
      const item = rows[0];
      if (!item.active) throw Object.assign(new Error('Item is inactive and cannot be purchased'), { status: 409 });
      if (Number(line.quantity) > item.stock_available) {
        throw Object.assign(new Error(`Insufficient stock. Available quantity: ${item.stock_available}`), { status: 409 });
      }
    }

    const [purchase] = await conn.execute('INSERT INTO purchases (order_id,purchase_date) VALUES (?,?)', [orderId, req.body.purchase_date]);
    for (const line of req.body.items) {
      await conn.execute('INSERT INTO purchase_items (purchase_id,item_id,quantity) VALUES (?,?,?)', [purchase.insertId, line.item_id, line.quantity]);
      await conn.execute('UPDATE items SET stock_available = stock_available - ? WHERE id=?', [line.quantity, line.item_id]);
    }
    await conn.commit();
    res.status(201).json({ id: purchase.insertId, order_id: orderId, message: 'Purchase created successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Purchase failed; transaction rolled back' });
  } finally { conn.release(); }
});

app.get('/api/purchases', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.order_id, p.purchase_date,
             COUNT(pi.id) AS item_count,
             SUM(pi.quantity) AS total_quantity
      FROM purchases p JOIN purchase_items pi ON p.id=pi.purchase_id
      GROUP BY p.id ORDER BY p.id DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to load purchases' }); }
});

app.get('/api/purchases/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.order_id, p.purchase_date, i.id AS item_id, i.name AS item_name,
             it.type_name, pi.quantity, i.stock_available
      FROM purchases p
      JOIN purchase_items pi ON p.id=pi.purchase_id
      JOIN items i ON pi.item_id=i.id
      JOIN item_types it ON i.item_type_id=it.id
      WHERE p.id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Purchase not found' });
    res.json({ order_id: rows[0].order_id, purchase_date: rows[0].purchase_date, items: rows });
  } catch (err) { res.status(500).json({ error: 'Failed to load purchase details' }); }
});


app.put('/api/purchases/:id', async (req, res) => {
  const validationError = validatePurchaseBody(req.body);
  if (validationError) return bad(res, validationError);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [oldRows] = await conn.execute(`SELECT p.order_id,p.purchase_date,pi.item_id,pi.quantity FROM purchases p JOIN purchase_items pi ON p.id=pi.purchase_id WHERE p.id=? FOR UPDATE`, [req.params.id]);
    if (!oldRows.length) { await conn.rollback(); return res.status(404).json({ error: 'Purchase not found' }); }

    const oldMap = new Map(oldRows.map(r => [Number(r.item_id), Number(r.quantity)]));
    const newMap = new Map(req.body.items.map(r => [Number(r.item_id), Number(r.quantity)]));
    const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);

    for (const itemId of allIds) {
      const [items] = await conn.execute('SELECT id,active,stock_available FROM items WHERE id=? FOR UPDATE', [itemId]);
      if (!items.length) throw Object.assign(new Error('Item not found'), { status: 404 });
      const item = items[0];
      const oldQty = oldMap.get(itemId) || 0;
      const newQty = newMap.get(itemId) || 0;
      const difference = newQty - oldQty;
      if (difference > item.stock_available) throw Object.assign(new Error(`Insufficient stock for item ${itemId}`), { status: 409 });
      if (newQty > 0 && !item.active) throw Object.assign(new Error(`Item ${itemId} is inactive and cannot be used`), { status: 409 });
      if (difference !== 0) await conn.execute('UPDATE items SET stock_available=stock_available-? WHERE id=?', [difference, itemId]);
    }

    await conn.execute('UPDATE purchases SET purchase_date=? WHERE id=?', [req.body.purchase_date, req.params.id]);
    await conn.execute('DELETE FROM purchase_items WHERE purchase_id=?', [req.params.id]);
    for (const line of req.body.items) await conn.execute('INSERT INTO purchase_items (purchase_id,item_id,quantity) VALUES (?,?,?)', [req.params.id,line.item_id,line.quantity]);
    await conn.commit();
    res.json({ message: 'Purchase updated successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Purchase update failed; transaction rolled back' });
  } finally { conn.release(); }
});



const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
