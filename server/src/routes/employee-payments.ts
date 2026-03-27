
import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Get payments list (with filters)
router.get('/', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { employee_id, start_date, end_date } = req.query;
        let query = `
            SELECT ep.*, u.full_name as employee_name, cb.full_name as created_by_name
            FROM employee_payments ep
            JOIN users u ON ep.employee_id = u.id
            LEFT JOIN users cb ON ep.created_by = cb.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (employee_id) {
            query += ` AND ep.employee_id = ?`;
            params.push(employee_id);
        }
        if (start_date) {
            query += ` AND ep.payment_date >= ?`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND ep.payment_date <= ?`;
            params.push(end_date);
        }

        query += ` ORDER BY ep.payment_date DESC`;

        const payments = db.prepare(query).all(...params);
        res.json({ payments });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Add new payment
router.post('/', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { employee_id, amount, payment_date, payment_type, reference_mo_id, notes } = req.body;

        if (!employee_id || !amount) {
            return res.status(400).json({ error: 'Employee and Amount are required' });
        }

        const result = db.prepare(`
            INSERT INTO employee_payments (employee_id, amount, payment_date, payment_type, reference_mo_id, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            employee_id,
            amount,
            payment_date || new Date().toISOString(),
            payment_type || 'salary',
            reference_mo_id || null,
            notes || '',
            req.user!.id
        );

        // If this payment is linked to an MO, mark the MO as paid
        if (reference_mo_id) {
            db.prepare(`UPDATE manufacturing_orders SET payment_status = 'paid' WHERE id = ?`).run(reference_mo_id);
        }

        res.json({ id: result.lastInsertRowid, success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get Employee Balance / Stats
router.get('/:id/stats', roleMiddleware('admin', 'manager', 'tailor'), (req: AuthRequest, res) => {
    try {
        const employeeId = req.params.id;

        // 1. Total Earnings (Sum of labor_cost for completed MOs)
        const earnings = db.prepare(`
            SELECT SUM(labor_cost) as total_earnings 
            FROM manufacturing_orders 
            WHERE assigned_tailor_id = ? AND status = 'completed'
        `).get(employeeId) as { total_earnings: number };

        // 2. Pending Earnings (Sum of labor_cost for completed MOs that are unpaid)
        const pending = db.prepare(`
            SELECT SUM(labor_cost) as pending_amount
            FROM manufacturing_orders 
            WHERE assigned_tailor_id = ? AND status = 'completed' AND payment_status = 'unpaid'
        `).get(employeeId) as { pending_amount: number };

        // 3. Total Paid (Sum of payments)
        const paid = db.prepare(`
            SELECT SUM(amount) as total_paid 
            FROM employee_payments 
            WHERE employee_id = ?
        `).get(employeeId) as { total_paid: number };

        res.json({
            total_earnings: earnings?.total_earnings || 0,
            pending_amount: pending?.pending_amount || 0,
            total_paid: paid?.total_paid || 0,
            allowable_balance: (earnings?.total_earnings || 0) - (paid?.total_paid || 0)
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk Pay based on Unpaid MOs
router.post('/bulk-pay', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { employee_id, mo_ids, payment_date, notes } = req.body; // mo_ids is array of MO IDs

        if (!employee_id || !mo_ids || !Array.isArray(mo_ids) || mo_ids.length === 0) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        // Calculate total amount
        const placeholders = mo_ids.map(() => '?').join(',');
        const mos = db.prepare(`
            SELECT id, labor_cost FROM manufacturing_orders 
            WHERE id IN (${placeholders}) AND assigned_tailor_id = ? AND payment_status = 'unpaid'
        `).all(...mo_ids, employee_id) as any[];

        if (mos.length === 0) {
            return res.status(400).json({ error: 'No valid unpaid orders found for this employee' });
        }

        const totalAmount = mos.reduce((sum, mo) => sum + (mo.labor_cost || 0), 0);

        // Create one payment record
        const result = db.prepare(`
            INSERT INTO employee_payments (employee_id, amount, payment_date, payment_type, notes, created_by)
            VALUES (?, ?, ?, 'commission', ?, ?)
        `).run(
            employee_id,
            totalAmount,
            payment_date || new Date().toISOString(),
            notes || `Bulk payment for ${mos.length} orders`,
            req.user!.id
        );

        // Mark MOs as paid
        const updateStmt = db.prepare(`UPDATE manufacturing_orders SET payment_status = 'paid' WHERE id = ?`);
        const updateTransaction = db.transaction((ids) => {
            for (const id of ids) updateStmt.run(id);
        });
        updateTransaction(mo_ids);

        res.json({ success: true, payment_id: result.lastInsertRowid, amount: totalAmount, count: mos.length });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
