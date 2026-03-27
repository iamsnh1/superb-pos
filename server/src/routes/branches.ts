import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Get all branches
router.get('/', (req: AuthRequest, res) => {
    try {
        const branches = db.prepare('SELECT * FROM branches').all();
        res.json({ branches });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Create branch
router.post('/', roleMiddleware('admin'), (req: AuthRequest, res) => {
    try {
        const { name, address, phone, email } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const result = db.prepare(`
            INSERT INTO branches (name, address, phone, email)
            VALUES (?, ?, ?, ?)
        `).run(name, address ?? null, phone ?? null, email ?? null);
        const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(result.lastInsertRowid);
        res.json({ branch });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Update branch
router.put('/:id', roleMiddleware('admin'), (req: AuthRequest, res) => {
    try {
        const { name, address, phone, email, is_active } = req.body;
        const updates: string[] = [];
        const params: any[] = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (address !== undefined) { updates.push('address = ?'); params.push(address); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

        if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

        params.push(req.params.id);
        db.prepare(`UPDATE branches SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id);
        res.json({ branch });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
