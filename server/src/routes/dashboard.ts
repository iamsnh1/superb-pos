import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Dashboard stats
router.get('/stats', (req: AuthRequest, res) => {
  try {
    const branchId = req.user!.branch_id || 1;

    // Today's orders
    const todayOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders 
      WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime') AND branch_id = ?
    `).get(branchId) as any;

    // Pending orders
    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('delivered', 'cancelled') AND branch_id = ?
    `).get(branchId) as any;

    // Today's revenue
    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments 
      WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')
    `).get() as any;

    // Total customers
    const totalCustomers = db.prepare(`
      SELECT COUNT(*) as count FROM customers WHERE branch_id = ?
    `).get(branchId) as any;

    // Low stock items
    const lowStock = db.prepare(`
      SELECT COUNT(*) as count FROM stock_levels WHERE quantity <= reorder_level AND reorder_level > 0 AND branch_id = ?
    `).get(branchId) as any;

    // Orders by status
    const ordersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM orders WHERE branch_id = ? GROUP BY status
    `).all(branchId);

    // Recent orders
    const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at, c.full_name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.branch_id = ?
      ORDER BY o.created_at DESC LIMIT 5
    `).all(branchId);

    // Urgent orders
    const urgentOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE priority = 'urgent' AND status NOT IN ('delivered', 'cancelled') AND branch_id = ?
    `).get(branchId) as any;

    // Recent Production (Manufacturing Orders)
    const recentProduction = db.prepare(`
      SELECT mo.id, mo.mo_number, mo.status, o.order_number, o.customer_id, c.full_name as customer_name, o.delivery_date
      FROM manufacturing_orders mo
      JOIN orders o ON mo.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE o.branch_id = ?
      ORDER BY mo.created_at DESC LIMIT 5
    `).all(branchId);

    // Overdue Payments (Orders with balance > 0 and past delivery date)
    const overduePayments = db.prepare(`
      SELECT COUNT(*) as count FROM orders 
      WHERE balance_amount > 0 AND delivery_date < DATE('now') AND status != 'cancelled' AND branch_id = ?
    `).get(branchId) as any;

    res.json({
      today_orders: todayOrders?.count || 0,
      pending_orders: pendingOrders?.count || 0,
      today_revenue: todayRevenue?.total || 0,
      total_customers: totalCustomers?.count || 0,
      low_stock_count: lowStock?.count || 0,
      urgent_orders_count: urgentOrders?.count || 0,
      overdue_payments_count: overduePayments?.count || 0,
      orders_by_status: ordersByStatus,
      recent_orders: recentOrders,
      recent_production: recentProduction
    });
  } catch (error: any) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Sales report
router.get('/sales', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
  try {
    const { start_date, end_date } = req.query;
    const branchId = req.user!.branch_id || 1;

    const query = `
      SELECT 
        DATE(o.created_at) as date,
        COUNT(*) as orders,
        SUM(o.net_amount) as revenue,
        SUM(o.advance_amount) as collected
      FROM orders o
      WHERE o.branch_id = ?
      ${start_date ? `AND o.created_at >= ?` : ''}
      ${end_date ? `AND o.created_at <= ?` : ''}
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
    `;

    const params: any[] = [branchId];
    if (start_date) params.push(start_date);
    if (end_date) params.push(end_date);

    const sales = db.prepare(query).all(...params);
    res.json({ sales });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Orders by garment type
router.get('/garment-types', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
  try {
    const branchId = req.user!.branch_id || 1;

    const data = db.prepare(`
      SELECT garment_type, COUNT(*) as count, SUM(net_amount) as revenue
      FROM orders
      WHERE branch_id = ? AND status != 'cancelled'
      GROUP BY garment_type
      ORDER BY count DESC
    `).all(branchId);

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Top customers
router.get('/top-customers', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
  try {
    const branchId = req.user!.branch_id || 1;

    const customers = db.prepare(`
      SELECT c.id, c.customer_code, c.full_name, c.phone,
             COUNT(o.id) as order_count,
             SUM(o.net_amount) as total_spent
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE c.branch_id = ? AND o.status != 'cancelled'
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 10
    `).all(branchId);

    res.json({ customers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
