import { Router } from 'express';
import { db, generateNextNumber } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List fabrics with search
router.get('/', (req: AuthRequest, res) => {
    try {
        const { search, active_only, page = 1, limit = 100 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let query = `
      SELECT fc.*, s.name as supplier_name
      FROM fabric_catalogue fc
      LEFT JOIN suppliers s ON fc.supplier_id = s.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (active_only === 'true') {
            query += ` AND fc.is_active = 1`;
        }

        if (search) {
            query += ` AND (fc.name LIKE ? OR fc.code LIKE ? OR fc.fabric_type LIKE ? OR fc.color LIKE ? OR fc.material LIKE ?)`;
            const term = `%${search}%`;
            params.push(term, term, term, term, term);
        }

        const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM');
        const total = (db.prepare(countQuery).get(...params) as any).count;

        query += ` ORDER BY fc.name ASC LIMIT ? OFFSET ?`;
        params.push(Number(limit), offset);

        const fabrics = db.prepare(query).all(...params);
        res.json({ fabrics, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get single fabric
router.get('/:id', (req: AuthRequest, res) => {
    try {
        const fabric = db.prepare(`
      SELECT fc.*, s.name as supplier_name
      FROM fabric_catalogue fc
      LEFT JOIN suppliers s ON fc.supplier_id = s.id
      WHERE fc.id = ?
    `).get(req.params.id);

        if (!fabric) return res.status(404).json({ error: 'Fabric not found' });
        res.json({ fabric });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Create fabric
router.post('/', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
    try {
        const { name, fabric_type, color, material, price_per_meter = 0, available_meters = 0, supplier_id, notes } = req.body;
        const branchId = req.user!.branch_id || 1;

        if (!name) return res.status(400).json({ error: 'Fabric name is required' });

        const code = generateNextNumber('FAB', 'fabric_catalogue', 'code', false);

        const result = db.prepare(`
      INSERT INTO fabric_catalogue (name, code, fabric_type, color, material, price_per_meter, available_meters, supplier_id, branch_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, code, fabric_type, color, material, price_per_meter, available_meters, supplier_id || null, branchId, notes);

        const fabric = db.prepare('SELECT * FROM fabric_catalogue WHERE id = ?').get(result.lastInsertRowid);
        res.json({ fabric });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update fabric
router.put('/:id', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
    try {
        const { name, fabric_type, color, material, price_per_meter, available_meters, supplier_id, notes, is_active } = req.body;

        db.prepare(`
      UPDATE fabric_catalogue SET 
        name = ?, fabric_type = ?, color = ?, material = ?, price_per_meter = ?, 
        available_meters = ?, supplier_id = ?, notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, fabric_type, color, material, price_per_meter, available_meters, supplier_id || null, notes, is_active ?? 1, req.params.id);

        const fabric = db.prepare('SELECT * FROM fabric_catalogue WHERE id = ?').get(req.params.id);
        res.json({ fabric });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete fabric
router.delete('/:id', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    db.prepare('DELETE FROM fabric_catalogue WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

export default router;
