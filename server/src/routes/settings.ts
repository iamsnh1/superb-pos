import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'manager'));

// Get all settings
router.get('/', (req: AuthRequest, res) => {
    const settings = db.prepare('SELECT key, value FROM settings').all();
    const settingsMap: Record<string, string> = {};
    for (const s of settings as { key: string; value: string }[]) {
        settingsMap[s.key] = s.value;
    }
    res.json({ settings: settingsMap });
});

// Update settings
router.put('/', (req: AuthRequest, res) => {
    const updates = req.body;

    const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

    for (const [key, value] of Object.entries(updates)) {
        stmt.run(key, value);
    }

    res.json({ success: true });
});

// ========== Branches ==========

router.get('/branches', (req: AuthRequest, res) => {
    const branches = db.prepare('SELECT * FROM branches ORDER BY name').all();
    res.json({ branches });
});

router.post('/branches', roleMiddleware('admin'), (req: AuthRequest, res) => {
    const { name, address, phone, email } = req.body;

    const result = db.prepare(`
    INSERT INTO branches (name, address, phone, email) VALUES (?, ?, ?, ?)
  `).run(name, address, phone, email);

    const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(result.lastInsertRowid);
    res.json({ branch });
});

router.put('/branches/:id', roleMiddleware('admin'), (req: AuthRequest, res) => {
    const { name, address, phone, email, is_active } = req.body;

    db.prepare(`
    UPDATE branches SET name = ?, address = ?, phone = ?, email = ?, is_active = ? WHERE id = ?
  `).run(name, address, phone, email, is_active ? 1 : 0, req.params.id);

    const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id);
    res.json({ branch });
});

// ========== Users ==========

router.get('/users', roleMiddleware('admin'), (req: AuthRequest, res) => {
    const users = db.prepare(`
    SELECT id, email, full_name, role, branch_id, phone, is_active, created_at
    FROM users ORDER BY full_name
  `).all();
    res.json({ users });
});

router.post('/users', roleMiddleware('admin'), async (req: AuthRequest, res) => {
    const { email, password, full_name, role, branch_id, phone } = req.body;
    const bcrypt = await import('bcryptjs');

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, branch_id, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(email, passwordHash, full_name, role, branch_id, phone);

    const user = db.prepare('SELECT id, email, full_name, role, branch_id FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.json({ user });
});

router.put('/users/:id', roleMiddleware('admin'), (req: AuthRequest, res) => {
    const { full_name, role, branch_id, phone, is_active } = req.body;

    db.prepare(`
    UPDATE users SET full_name = ?, role = ?, branch_id = ?, phone = ?, is_active = ? WHERE id = ?
  `).run(full_name, role, branch_id, phone, is_active ? 1 : 0, req.params.id);

    const user = db.prepare('SELECT id, email, full_name, role, branch_id FROM users WHERE id = ?').get(req.params.id);
    res.json({ user });
});

export default router;
