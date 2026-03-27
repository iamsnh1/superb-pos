import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authMiddleware);

// List users/employees
router.get('/', (req: AuthRequest, res) => {
    try {
        const branchId = req.user!.branch_id || 1;
        const users = db.prepare(`
            SELECT id, email, full_name, role, phone, specialization, salary_type, base_salary, is_available, created_at 
            FROM users 
            WHERE branch_id = ?
        `).all(branchId);
        res.json({ users });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update user details
router.put('/:id', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { full_name, role, phone, specialization, salary_type, base_salary, is_available } = req.body;
        const updates: string[] = [];
        const params: any[] = [];

        if (full_name) { updates.push('full_name = ?'); params.push(full_name); }
        if (role) { updates.push('role = ?'); params.push(role); }
        if (phone) { updates.push('phone = ?'); params.push(phone); }
        if (specialization !== undefined) { updates.push('specialization = ?'); params.push(specialization); }
        if (salary_type) { updates.push('salary_type = ?'); params.push(salary_type); }
        if (base_salary !== undefined) { updates.push('base_salary = ?'); params.push(parseFloat(base_salary) || 0); }
        if (is_available !== undefined) { updates.push('is_available = ?'); params.push(is_available ? 1 : 0); }

        if (updates.length > 0) {
            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            params.push(req.params.id);
            db.prepare(query).run(...params);
        }
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Add new team member
router.post('/', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { email, password, full_name, role, phone, specialization, salary_type, base_salary, branch_id } = req.body;
        const finalBranchId = branch_id || req.user!.branch_id || 1;
        const hashedPassword = bcrypt.hashSync(password || 'team123', 10);

        const result = db.prepare(`
            INSERT INTO users (email, password_hash, full_name, role, phone, specialization, salary_type, base_salary, branch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(email, hashedPassword, full_name, role, phone, specialization || '', salary_type || 'monthly', parseFloat(base_salary) || 0, finalBranchId);

        res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
