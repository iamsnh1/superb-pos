import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// ========== EXPENSE CATEGORIES ==========

// List categories
router.get('/categories', (req: AuthRequest, res) => {
    try {
        const categories = db.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all();
        res.json({ categories });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Create category
router.post('/categories', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const result = db.prepare('INSERT INTO expense_categories (name, description) VALUES (?, ?)').run(name, description);
        const category = db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(result.lastInsertRowid);
        res.json({ category });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update category
router.put('/categories/:id', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { name, description, is_active } = req.body;
        db.prepare('UPDATE expense_categories SET name = ?, description = ?, is_active = ? WHERE id = ?')
            .run(name, description, is_active ?? 1, req.params.id);
        const category = db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(req.params.id);
        res.json({ category });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ========== EXPENSES ==========

// List expenses with filters
router.get('/', (req: AuthRequest, res) => {
    try {
        const { category_id, start_date, end_date, page = 1, limit = 50 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const branchId = req.user!.branch_id || 1;

        let query = `
      SELECT e.*, ec.name as category_name, u.full_name as created_by_name
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.branch_id = ?
    `;
        const params: any[] = [branchId];

        if (category_id) {
            query += ` AND e.category_id = ?`;
            params.push(category_id);
        }
        if (start_date) {
            query += ` AND e.expense_date >= ?`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND e.expense_date <= ?`;
            params.push(end_date);
        }

        const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM');
        const total = (db.prepare(countQuery).get(...params) as any).count;

        query += ` ORDER BY e.expense_date DESC, e.created_at DESC LIMIT ? OFFSET ?`;
        params.push(Number(limit), offset);

        const expenses = db.prepare(query).all(...params);
        res.json({ expenses, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Summary by category (for reports)
router.get('/summary', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { start_date, end_date } = req.query;
        const branchId = req.user!.branch_id || 1;

        let query = `
      SELECT ec.name as category, SUM(e.amount) as total, COUNT(*) as count
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.branch_id = ?
    `;
        const params: any[] = [branchId];

        if (start_date) {
            query += ` AND e.expense_date >= ?`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND e.expense_date <= ?`;
            params.push(end_date);
        }

        query += ` GROUP BY ec.name ORDER BY total DESC`;

        const summary = db.prepare(query).all(...params);

        // Total expenses
        let totalQuery = `SELECT SUM(amount) as total FROM expenses WHERE branch_id = ?`;
        const totalParams: any[] = [branchId];
        if (start_date) { totalQuery += ` AND expense_date >= ?`; totalParams.push(start_date); }
        if (end_date) { totalQuery += ` AND expense_date <= ?`; totalParams.push(end_date); }
        const totalExpenses = (db.prepare(totalQuery).get(...totalParams) as any)?.total || 0;

        res.json({ summary, total_expenses: totalExpenses });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Create expense
router.post('/', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { category_id, amount, expense_date, description, payment_method = 'cash', reference } = req.body;
        const branchId = req.user!.branch_id || 1;

        if (!category_id || !amount || !expense_date) {
            return res.status(400).json({ error: 'Category, amount, and date are required' });
        }

        const result = db.prepare(`
      INSERT INTO expenses (category_id, branch_id, amount, expense_date, description, payment_method, reference, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(category_id, branchId, amount, expense_date, description, payment_method, reference, req.user!.id);

        const expense = db.prepare(`
      SELECT e.*, ec.name as category_name
      FROM expenses e JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

        res.json({ expense });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update expense
router.put('/:id', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { category_id, amount, expense_date, description, payment_method, reference } = req.body;

        db.prepare(`
      UPDATE expenses SET category_id = ?, amount = ?, expense_date = ?, description = ?, payment_method = ?, reference = ?
      WHERE id = ?
    `).run(category_id, amount, expense_date, description, payment_method, reference, req.params.id);

        const expense = db.prepare(`
      SELECT e.*, ec.name as category_name
      FROM expenses e JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.id = ?
    `).get(req.params.id);

        res.json({ expense });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete expense
router.delete('/:id', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

export default router;
