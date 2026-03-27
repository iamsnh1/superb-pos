import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// ========== Categories ==========

router.get('/categories', (req: AuthRequest, res) => {
  const categories = db.prepare(`SELECT * FROM inventory_categories ORDER BY name`).all();
  res.json({ categories });
});

router.post('/categories', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
  const { name, description, parent_id } = req.body;
  const branchId = req.user!.branch_id || 1;

  const result = db.prepare(`
    INSERT INTO inventory_categories (name, description, parent_id, branch_id)
    VALUES (?, ?, ?, ?)
  `).run(name, description, parent_id, branchId);

  const category = db.prepare('SELECT * FROM inventory_categories WHERE id = ?').get(result.lastInsertRowid);
  res.json({ category });
});

// ========== Items ==========

router.get('/items', (req: AuthRequest, res) => {
  const { category_id, search } = req.query;

  let query = `
    SELECT i.*, c.name as category_name,
           COALESCE(s.quantity, 0) as stock_quantity,
           COALESCE(s.reserved_quantity, 0) as reserved_quantity,
           COALESCE(s.reorder_level, 0) as reorder_level
    FROM inventory_items i
    LEFT JOIN inventory_categories c ON i.category_id = c.id
    LEFT JOIN stock_levels s ON i.id = s.item_id AND s.branch_id = ?
    WHERE i.is_active = 1
  `;
  const params: any[] = [req.user!.branch_id || 1];

  if (category_id) {
    query += ` AND i.category_id = ?`;
    params.push(category_id);
  }

  if (search) {
    query += ` AND (i.name LIKE ? OR i.item_code LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY i.name`;
  const items = db.prepare(query).all(...params);

  res.json({ items });
});

router.get('/items/:id', (req: AuthRequest, res) => {
  const item = db.prepare(`
    SELECT i.*, c.name as category_name FROM inventory_items i
    LEFT JOIN inventory_categories c ON i.category_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);
  res.json({ item });
});

router.post('/items', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
  const { name, description, category_id, unit = 'pieces', attributes, initial_quantity = 0, reorder_level = 0 } = req.body;
  const branchId = req.user!.branch_id || 1;

  // Generate item code
  const count = (db.prepare('SELECT COUNT(*) as c FROM inventory_items').get() as any).c;
  const itemCode = `ITM-${String(count + 1).padStart(4, '0')}`;

  const result = db.prepare(`
    INSERT INTO inventory_items (item_code, name, description, category_id, unit, attributes, branch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(itemCode, name, description, category_id, unit, JSON.stringify(attributes || {}), branchId);

  const itemId = result.lastInsertRowid;

  // Initialize stock level
  db.prepare(`
    INSERT INTO stock_levels (item_id, branch_id, quantity, reorder_level)
    VALUES (?, ?, ?, ?)
  `).run(itemId, branchId, initial_quantity, reorder_level);

  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(itemId);
  res.json({ item });
});

router.put('/items/:id', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
  const { name, description, category_id, unit, attributes, reorder_level } = req.body;
  const branchId = req.user!.branch_id || 1;

  db.prepare(`
    UPDATE inventory_items SET name = ?, description = ?, category_id = ?, unit = ?, attributes = ?
    WHERE id = ?
  `).run(name, description, category_id, unit, JSON.stringify(attributes || {}), req.params.id);

  if (reorder_level !== undefined) {
    db.prepare(`
      INSERT INTO stock_levels (item_id, branch_id, reorder_level) VALUES (?, ?, ?)
      ON CONFLICT(item_id, branch_id) DO UPDATE SET reorder_level = excluded.reorder_level
    `).run(req.params.id, branchId, reorder_level);
  }

  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  res.json({ item });
});

// ========== Stock ==========

router.get('/stock', (req: AuthRequest, res) => {
  const branchId = req.user!.branch_id || 1;

  const stock = db.prepare(`
    SELECT s.*, i.item_code, i.name, i.unit, i.attributes
    FROM stock_levels s
    JOIN inventory_items i ON s.item_id = i.id
    WHERE s.branch_id = ?
    ORDER BY i.name
  `).all(branchId);

  res.json({ stock });
});

router.get('/stock/low', (req: AuthRequest, res) => {
  const branchId = req.user!.branch_id || 1;

  const lowStock = db.prepare(`
    SELECT s.*, i.item_code, i.name, i.unit
    FROM stock_levels s
    JOIN inventory_items i ON s.item_id = i.id
    WHERE s.branch_id = ? AND s.quantity <= s.reorder_level AND s.reorder_level > 0
    ORDER BY (s.quantity / s.reorder_level)
  `).all(branchId);

  res.json({ items: lowStock });
});

// Stock transactions
router.get('/transactions', (req: AuthRequest, res) => {
  const { item_id, limit = 50 } = req.query;
  const branchId = req.user!.branch_id || 1;

  let query = `
    SELECT t.*, i.name as item_name, i.item_code, u.full_name as created_by_name
    FROM stock_transactions t
    JOIN inventory_items i ON t.item_id = i.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.branch_id = ?
  `;
  const params: any[] = [branchId];

  if (item_id) {
    query += ` AND t.item_id = ?`;
    params.push(item_id);
  }

  query += ` ORDER BY t.created_at DESC LIMIT ?`;
  params.push(Number(limit));

  const transactions = db.prepare(query).all(...params);
  res.json({ transactions });
});

router.post('/transactions', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
  const { item_id, transaction_type, quantity, reference_type, reference_id, notes } = req.body;
  const branchId = req.user!.branch_id || 1;

  // Record transaction
  const result = db.prepare(`
    INSERT INTO stock_transactions (item_id, branch_id, transaction_type, quantity, reference_type, reference_id, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item_id, branchId, transaction_type, quantity, reference_type, reference_id, notes, req.user!.id);

  // Update stock level
  const delta = ['purchase', 'adjustment', 'transfer_in'].includes(transaction_type) ? quantity : -quantity;
  db.prepare(`
    INSERT INTO stock_levels (item_id, branch_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT(item_id, branch_id) DO UPDATE SET quantity = quantity + ?
  `).run(item_id, branchId, delta, delta);

  res.json({ success: true, transactionId: result.lastInsertRowid });
});

export default router;
