import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'manager'));

// Tailor-wise productivity
router.get('/tailor-productivity', (req: AuthRequest, res) => {
    try {
        const { start_date, end_date } = req.query;
        const branchId = req.user!.branch_id || 1;

        let dateFilter = '';
        const params: any[] = [branchId];
        if (start_date) { dateFilter += ` AND mo.created_at >= ?`; params.push(start_date); }
        if (end_date) { dateFilter += ` AND mo.created_at <= ?`; params.push(end_date); }

        const tailors = db.prepare(`
      SELECT 
        u.id, u.full_name,
        COUNT(mo.id) as total_orders,
        SUM(CASE WHEN mo.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN mo.status IN ('pending','cutting','stitching','finishing') THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN mo.status = 'rework' THEN 1 ELSE 0 END) as rework_orders,
        ROUND(AVG(mo.actual_hours), 1) as avg_hours,
        SUM(mo.labor_cost) as total_earnings,
        SUM(CASE WHEN mo.qc_passed = 1 THEN 1 ELSE 0 END) as qc_passed,
        SUM(CASE WHEN mo.qc_passed = 0 AND mo.qc_passed IS NOT NULL THEN 1 ELSE 0 END) as qc_failed
      FROM users u
      LEFT JOIN manufacturing_orders mo ON u.id = mo.assigned_tailor_id
      LEFT JOIN orders o ON mo.order_id = o.id
      WHERE u.role = 'tailor' AND u.is_active = 1 AND (u.branch_id = ? OR u.branch_id IS NULL) ${dateFilter}
      GROUP BY u.id
      ORDER BY completed_orders DESC
    `).all(...params);

        res.json({ tailors });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Pending customer balances
router.get('/pending-balances', (req: AuthRequest, res) => {
    try {
        const branchId = req.user!.branch_id || 1;

        const customers = db.prepare(`
      SELECT 
        c.id, c.customer_code, c.full_name, c.phone,
        COUNT(o.id) as total_orders,
        SUM(o.balance_amount) as total_balance,
        SUM(o.net_amount) as total_billed,
        SUM(o.net_amount - o.balance_amount) as total_paid
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE c.branch_id = ? AND o.balance_amount > 0 AND o.status != 'cancelled'
      GROUP BY c.id
      ORDER BY total_balance DESC
    `).all(branchId);

        const totalPending = customers.reduce((sum: number, c: any) => sum + c.total_balance, 0);

        res.json({ customers, total_pending: totalPending });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Fabric consumption vs purchases
router.get('/fabric-analysis', (req: AuthRequest, res) => {
    try {
        const { start_date, end_date } = req.query;
        const branchId = req.user!.branch_id || 1;

        let dateFilter = '';
        const params: any[] = [branchId];
        if (start_date) { dateFilter += ` AND st.created_at >= ?`; params.push(start_date); }
        if (end_date) { dateFilter += ` AND st.created_at <= ?`; params.push(end_date); }

        // Get consumption and purchase data per item
        const items = db.prepare(`
      SELECT 
        ii.id, ii.name, ii.item_code,
        SUM(CASE WHEN st.transaction_type = 'purchase' THEN st.quantity ELSE 0 END) as purchased,
        SUM(CASE WHEN st.transaction_type = 'consumption' THEN st.quantity ELSE 0 END) as consumed,
        SUM(CASE WHEN st.transaction_type IN ('adjustment','transfer_in') THEN st.quantity ELSE 0 END) as adjusted_in,
        SUM(CASE WHEN st.transaction_type = 'transfer_out' THEN st.quantity ELSE 0 END) as transferred_out,
        sl.quantity as current_stock,
        sl.reorder_level
      FROM inventory_items ii
      LEFT JOIN stock_transactions st ON ii.id = st.item_id AND st.branch_id = ? ${dateFilter}
      LEFT JOIN stock_levels sl ON ii.id = sl.item_id AND sl.branch_id = ?
      WHERE ii.is_active = 1
      GROUP BY ii.id
      HAVING purchased > 0 OR consumed > 0
      ORDER BY consumed DESC
    `).all(...params, branchId);

        res.json({ items });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Revenue by garment type (detailed)
router.get('/revenue-by-garment', (req: AuthRequest, res) => {
    try {
        const { start_date, end_date } = req.query;
        const branchId = req.user!.branch_id || 1;

        let dateFilter = '';
        const params: any[] = [branchId];
        if (start_date) { dateFilter += ` AND o.created_at >= ?`; params.push(start_date); }
        if (end_date) { dateFilter += ` AND o.created_at <= ?`; params.push(end_date); }

        const data = db.prepare(`
      SELECT 
        o.garment_type,
        COUNT(*) as order_count,
        SUM(o.net_amount) as total_revenue,
        AVG(o.net_amount) as avg_order_value,
        SUM(o.balance_amount) as pending_amount,
        SUM(CASE WHEN o.priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
        SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
      FROM orders o
      WHERE o.branch_id = ? AND o.status != 'cancelled' ${dateFilter}
      GROUP BY o.garment_type
      ORDER BY total_revenue DESC
    `).all(...params);

        res.json({ data });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Top customers (detailed)
router.get('/top-customers', (req: AuthRequest, res) => {
    try {
        const { start_date, end_date, limit: customLimit } = req.query;
        const branchId = req.user!.branch_id || 1;
        const resultLimit = Number(customLimit) || 20;

        let dateFilter = '';
        const params: any[] = [branchId];
        if (start_date) { dateFilter += ` AND o.created_at >= ?`; params.push(start_date); }
        if (end_date) { dateFilter += ` AND o.created_at <= ?`; params.push(end_date); }

        const customers = db.prepare(`
      SELECT 
        c.id, c.customer_code, c.full_name, c.phone, c.customer_group,
        COUNT(o.id) as order_count,
        SUM(o.net_amount) as total_spent,
        SUM(o.balance_amount) as pending_balance,
        MAX(o.created_at) as last_order_date,
        GROUP_CONCAT(DISTINCT o.garment_type) as garment_types
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE c.branch_id = ? AND o.status != 'cancelled' ${dateFilter}
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT ?
    `).all(...params, resultLimit);

        res.json({ customers });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Profit & Loss summary  
router.get('/profit-loss', (req: AuthRequest, res) => {
    try {
        const { start_date, end_date } = req.query;
        const branchId = req.user!.branch_id || 1;

        let dateFilter = '';
        const revenueParams: any[] = [branchId];
        const expenseParams: any[] = [branchId];

        if (start_date) {
            dateFilter = ` AND created_at >= ?`;
            revenueParams.push(start_date);
            expenseParams.push(start_date);
        }
        if (end_date) {
            dateFilter += ` AND created_at <= ?`;
            revenueParams.push(end_date);
            expenseParams.push(end_date);
        }

        // Total revenue (payments collected)
        const revenue = db.prepare(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE o.branch_id = ? ${dateFilter.replace('created_at', 'p.created_at')}
    `).get(...revenueParams) as any;

        // Total expenses
        const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE branch_id = ? ${dateFilter.replace('created_at', 'expense_date')}
    `).get(...expenseParams) as any;

        // Tailor labor costs
        const laborCosts = db.prepare(`
      SELECT COALESCE(SUM(mo.labor_cost), 0) as total
      FROM manufacturing_orders mo
      JOIN orders o ON mo.order_id = o.id
      WHERE o.branch_id = ? ${dateFilter.replace('created_at', 'mo.created_at')}
    `).get(...revenueParams) as any;

        res.json({
            revenue: revenue?.total || 0,
            expenses: expenses?.total || 0,
            labor_costs: laborCosts?.total || 0,
            gross_profit: (revenue?.total || 0) - (expenses?.total || 0) - (laborCosts?.total || 0)
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
