import { Router } from 'express';
import { db, generateNextNumber } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List invoices (for Record All Bills)
router.get('/invoices', (req: AuthRequest, res) => {
    const branchId = req.user!.branch_id ?? 1;
    const rows = db.prepare(`
        SELECT i.*, o.order_number, o.order_id, o.net_amount, o.advance_amount, o.balance_amount, o.delivery_date,
               c.full_name as customer_name, c.phone as customer_phone
        FROM invoices i
        JOIN orders o ON i.order_id = o.id
        JOIN customers c ON o.customer_id = c.id
        WHERE o.branch_id = ?
        ORDER BY i.created_at DESC
        LIMIT 500
    `).all(branchId);
    res.json({ invoices: rows });
});

// Get bill data for an order (for PDF export)
router.get('/bill/:orderId', (req: AuthRequest, res) => {
    const orderId = req.params.orderId;
    const order = db.prepare(`
        SELECT o.*, c.full_name as customer_name, c.phone as customer_phone
        FROM orders o JOIN customers c ON o.customer_id = c.id
        WHERE o.id = ?
    `).get(orderId) as any;
    if (!order) return res.status(404).json({ error: 'Order not found' });

    let invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId) as any;
    if (!invoice && order.invoice_id) {
        invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(order.invoice_id) as any;
    }

    let items: any[] = [];
    let advanceAmount = order.advance_amount ?? 0;
    const invId = invoice?.id;
    if (invId) {
        const ordersWithInvoice = db.prepare(`
            SELECT o.* FROM orders o WHERE o.invoice_id = ?
        `).all(invId) as any[];
        items = ordersWithInvoice.map(o => {
            let ds = typeof o.design_specifications === 'string' ? (o.design_specifications ? JSON.parse(o.design_specifications) : null) : o.design_specifications;
            return {
                garment_type: o.garment_type,
                style: ds?.style || '',
                qty: o.qty || 1,
                price: o.total_amount || o.net_amount,
                design_specifications: ds,
                trial_date: o.trial_date,
                delivery_date: o.delivery_date,
            };
        });
        advanceAmount = ordersWithInvoice.reduce((s: number, o: any) => s + (o.advance_amount || 0), 0);
    } else {
        let ds = typeof order.design_specifications === 'string' ? (order.design_specifications ? JSON.parse(order.design_specifications) : null) : order.design_specifications;
        items = [{
            garment_type: order.garment_type,
            style: ds?.style || '',
            qty: order.qty || 1,
            price: order.total_amount || order.net_amount,
            design_specifications: ds,
            trial_date: order.trial_date,
            delivery_date: order.delivery_date,
        }];
    }

    const invoiceNumber = invoice?.invoice_number || order.order_number;
    const grandTotal = invoice?.total_amount ?? order.net_amount ?? order.total_amount;

    res.json({
        invoiceNumber,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        items,
        grand_total: grandTotal,
        advance_amount: advanceAmount ?? 0,
    });
});

// List payments
router.get('/', (req: AuthRequest, res) => {
    const { order_id, type = 'all', page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const branchId = req.user!.branch_id || 1;

    let query = `
        SELECT p.*, o.order_number, c.full_name as customer_name
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        JOIN customers c ON o.customer_id = c.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (req.user!.role !== 'admin') {
        query += ` AND o.branch_id = ?`;
        params.push(branchId);
    }

    if (order_id) {
        query += ` AND p.order_id = ?`;
        params.push(order_id);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const payments = db.prepare(query).all(...params);
    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM').split('ORDER BY')[0];
    const total = (db.prepare(countQuery).get(...params) as any).count;

    res.json({ payments, total, page: Number(page), limit: Number(limit) });
});

// Record new payment
router.post('/', roleMiddleware('admin', 'manager', 'pos_operator'), (req: AuthRequest, res) => {
    const { order_id, amount, method, notes } = req.body;

    if (!order_id || !amount) {
        return res.status(400).json({ error: 'Order ID and amount required' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Insert payment
    const result = db.prepare(`
        INSERT INTO payments (order_id, amount, method, notes, collected_by, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(order_id, amount, method, notes, req.user!.id);

    // Update Order Balance
    // Logic: If status is 'pending', maybe it's advance amount?
    // If order is 'delivered' or 'completed', maybe it's final payment?
    // We update `advance_amount` if status is initial, or just track general `payments` sum? 
    // Schema has `advance_amount` and `balance_amount`.
    // Let's recalculate balance: Net Amount - Sum(Payments).

    const paidSum = (db.prepare('SELECT SUM(amount) as total FROM payments WHERE order_id = ?').get(order_id) as any).total || 0;
    const newBalance = order.net_amount - paidSum;

    // Determine if it's advance. If Paid < Net Amount, update advance?
    // Usually Advance is the first payment.
    // Let's just update balance_amount.
    // Also update advance_amount if order status represents early stage (optional).

    // Simple update:
    db.prepare(`
        UPDATE orders SET balance_amount = ?, advance_amount = CASE WHEN advance_amount = 0 THEN ? ELSE advance_amount END, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(newBalance, amount, order_id);

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
    res.json({ payment, balance: newBalance });
});

// Generate Invoice
router.post('/invoice', roleMiddleware('admin', 'manager', 'pos_operator'), (req: AuthRequest, res) => {
    const { order_id } = req.body;

    // Check existing
    const existing = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(order_id);
    if (existing) return res.json({ invoice: existing });

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const invoiceNumber = generateNextNumber('INV', 'invoices', 'invoice_number');

    const result = db.prepare(`
        INSERT INTO invoices (invoice_number, order_id, subtotal, discount_amount, tax_amount, total_amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
        invoiceNumber, order_id,
        order.total_amount, order.discount_amount, order.tax_amount, order.net_amount
    );

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid);
    res.json({ invoice });
});

export default router;
