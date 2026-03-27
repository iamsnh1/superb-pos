import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare(`
    SELECT id, email, password_hash, full_name, role, branch_id, is_active 
    FROM users WHERE email = ?
  `).get(email) as any;

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
        return res.status(401).json({ error: 'Account is disabled' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    // Log activity
    db.prepare(`INSERT INTO activity_log (user_id, action) VALUES (?, ?)`).run(user.id, 'login');

    res.json({
        token,
        user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            branch_id: user.branch_id,
        },
    });
});

// Register (admin only in production, open for demo)
router.post('/register', (req, res) => {
    const { email, password, full_name, role = 'pos_operator', branch_id = 1 } = req.body;

    if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Email, password, and full name required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, branch_id) 
    VALUES (?, ?, ?, ?, ?)
  `).run(email, passwordHash, full_name, role, branch_id);

    const token = generateToken(result.lastInsertRowid as number);

    res.json({
        token,
        user: {
            id: result.lastInsertRowid,
            email,
            full_name,
            role,
            branch_id,
        },
    });
});

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
    res.json({ user: req.user });
});

// Update profile
router.put('/profile', authMiddleware, (req: AuthRequest, res) => {
    const { full_name, phone } = req.body;

    db.prepare(`UPDATE users SET full_name = ?, phone = ? WHERE id = ?`).run(
        full_name || req.user!.full_name,
        phone || null,
        req.user!.id
    );

    res.json({ success: true });
});

// Change password
router.put('/password', authMiddleware, (req: AuthRequest, res) => {
    const { current_password, new_password } = req.body;

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;

    if (!bcrypt.compareSync(current_password, user.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user!.id);

    res.json({ success: true });
});

export default router;
