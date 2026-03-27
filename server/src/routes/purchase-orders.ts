import { Router } from 'express';
import { db, generateNextNumber } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List purchase orders
router.get('/', (req: AuthRequest, res) => {
    try {
        const { search, status } = req.query;
        const branchId = req.user!.branch_id || 1;

        let query = `
            SELECT po.*, s.name as supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.branch_id = ?
        `;
        const params: any[] = [branchId];

        if (search) { query += ` AND po.po_number LIKE ?`; params.push(`%${search}%`); }
        if (status) { query += ` AND po.status = ?`; params.push(status); }

        query += ` ORDER BY po.created_at DESC`;
        const purchase_orders = db.prepare(query).all(...params);
        res.json({ purchase_orders });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get single PO
router.get('/:id', (req: AuthRequest, res) => {
    try {
        const po = db.prepare(`
            SELECT po.*, s.name as supplier_name
            FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = ?
        `).get(req.params.id);
        if (!po) return res.status(404).json({ error: 'PO not found' });
        res.json({ purchase_order: po });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get PO items
router.get('/:id/items', (req: AuthRequest, res) => {
    try {
        const items = db.prepare(`
            SELECT poi.*, i.name as item_name, i.item_code, i.unit
            FROM purchase_order_items poi
            LEFT JOIN inventory_items i ON poi.item_id = i.id
            WHERE poi.po_id = ?
        `).all(req.params.id);
        res.json({ items });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Create PO
router.post('/', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
    try {
        const { supplier_id, notes, total_amount, expected_date } = req.body;
        if (!supplier_id) return res.status(400).json({ error: 'Supplier is required' });

        const branchId = req.user!.branch_id || 1;
        const poNumber = generateNextNumber('PO', 'purchase_orders', 'po_number');

        const result = db.prepare(`
            INSERT INTO purchase_orders (po_number, supplier_id, branch_id, total_amount, notes, expected_date, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(poNumber, supplier_id, branchId, total_amount ?? 0, notes ?? null, expected_date ?? null, req.user!.id);

        const purchase_order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(result.lastInsertRowid);
        res.json({ purchase_order });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Update PO
router.put('/:id', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
    try {
        const { status, notes, total_amount, received_date, expected_date } = req.body;
        const updates: string[] = [];
        const params: any[] = [];

        if (status !== undefined) { updates.push('status = ?'); params.push(status); }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
        if (total_amount !== undefined) { updates.push('total_amount = ?'); params.push(total_amount); }
        if (received_date !== undefined) { updates.push('received_date = ?'); params.push(received_date); }
        if (expected_date !== undefined) { updates.push('expected_date = ?'); params.push(expected_date); }

        if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

        params.push(req.params.id);
        db.prepare(`UPDATE purchase_orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const purchase_order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
        res.json({ purchase_order });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
