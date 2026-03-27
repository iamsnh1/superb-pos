import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List all active suppliers
router.get('/', (req: AuthRequest, res) => {
    try {
        const { search } = req.query;
        let query = `SELECT * FROM suppliers WHERE is_active = 1`;
        const params: any[] = [];

        if (search) {
            query += ` AND (name LIKE ? OR contact_person LIKE ? OR phone LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        query += ` ORDER BY name`;
        const suppliers = db.prepare(query).all(...params);
        res.json({ suppliers });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get single supplier
router.get('/:id', (req: AuthRequest, res) => {
    try {
        const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json({ supplier });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Create supplier
router.post('/', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
    try {
        const { name, contact_person, phone, email, address, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const result = db.prepare(`
            INSERT INTO suppliers (name, contact_person, phone, email, address, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(name, contact_person ?? null, phone ?? null, email ?? null, address ?? null, notes ?? null);

        const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
        res.json({ supplier });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Update supplier
router.put('/:id', roleMiddleware('admin', 'manager', 'inventory_manager'), (req: AuthRequest, res) => {
    try {
        const { name, contact_person, phone, email, address, notes, is_active } = req.body;
        const updates: string[] = [];
        const params: any[] = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (contact_person !== undefined) { updates.push('contact_person = ?'); params.push(contact_person); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (address !== undefined) { updates.push('address = ?'); params.push(address); }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

        if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

        params.push(req.params.id);
        db.prepare(`UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
        res.json({ supplier });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Delete (soft delete) supplier
router.delete('/:id', roleMiddleware('admin'), (req: AuthRequest, res) => {
    try {
        db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
