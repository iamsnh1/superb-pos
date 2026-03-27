import { Router } from 'express';
import { db, generateNextNumber } from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List customers with search and pagination
router.get('/', (req: AuthRequest, res) => {
    const { search = '', page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `SELECT * FROM customers WHERE 1=1`;
    const params: any[] = [];

    if (search) {
        query += ` AND (full_name LIKE ? OR phone LIKE ? OR customer_code LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    // Branch filter for non-admin
    if (req.user!.role !== 'admin' && req.user!.branch_id) {
        query += ` AND branch_id = ?`;
        params.push(req.user!.branch_id);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = (db.prepare(countQuery).get(...params) as any).count;

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const customers = db.prepare(query).all(...params);

    res.json({ customers, total, page: Number(page), limit: Number(limit) });
});

// Get single customer with measurements
router.get('/:id', (req: AuthRequest, res) => {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
    }

    const measurements = db.prepare(`
    SELECT * FROM measurement_profiles WHERE customer_id = ? ORDER BY created_at DESC
  `).all(req.params.id);

    res.json({ customer, measurements });
});

// Create customer
router.post('/', (req: AuthRequest, res) => {
    try {
        const { full_name, phone, email, address, birthday, notes } = req.body;

        if (!full_name) {
            return res.status(400).json({ error: 'Full name is required' });
        }

        const customerCode = generateNextNumber('none', 'customers', 'customer_code', false);
        const branchId = req.user!.branch_id || 1;

        const result = db.prepare(`
        INSERT INTO customers (
          customer_code, full_name, phone, email, address, city, state, zip_code, birthday, anniversary, 
          gender, customer_group, tags, referrer_id, photo_url, notes, branch_id, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
            customerCode, full_name, phone, email, address, req.body.city || null, req.body.state || null, req.body.zip_code || null,
            birthday || null, req.body.anniversary || null, req.body.gender || null, req.body.customer_group || 'Regular',
            JSON.stringify(req.body.tags || []), req.body.referrer_id || null, req.body.photo_url || null, notes || null,
            branchId, req.user!.id
        );

        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
        res.json({ customer });
    } catch (err: any) {
        console.error('Customer Creation Error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Update customer
router.put('/:id', (req: AuthRequest, res) => {
    const { full_name, phone, email, address, birthday, notes } = req.body;

    db.prepare(`
    UPDATE customers SET 
      full_name = ?, phone = ?, email = ?, address = ?, city = ?, state = ?, zip_code = ?, 
      birthday = ?, anniversary = ?, gender = ?, customer_group = ?, tags = ?, 
      referrer_id = ?, photo_url = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
        full_name, phone, email, address, req.body.city, req.body.state, req.body.zip_code,
        birthday, req.body.anniversary, req.body.gender, req.body.customer_group,
        JSON.stringify(req.body.tags || []), req.body.referrer_id, req.body.photo_url,
        notes, req.params.id
    );

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json({ customer });
});

// Delete customer
router.delete('/:id', (req: AuthRequest, res) => {
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// ========== Measurements ==========

// Get measurements for customer
router.get('/:id/measurements', (req: AuthRequest, res) => {
    const measurements = db.prepare(`
    SELECT m.*, o.order_number as bill_no, o.design_specifications as design_spec, o.notes as bill_notes
    FROM measurement_profiles m
    LEFT JOIN orders o ON o.id = (
        SELECT id FROM orders 
        WHERE (measurement_profile_id = m.id OR (measurement_profile_id IS NULL AND garment_type = m.garment_type AND customer_id = m.customer_id))
        ORDER BY created_at DESC 
        LIMIT 1
    )
    WHERE m.customer_id = ? 
    ORDER BY m.created_at DESC
  `).all(req.params.id);
    res.json({ measurements });
});

// Add measurement profile
router.post('/:id/measurements', (req: AuthRequest, res) => {
    const { garment_type, label = 'Default', measurements, notes } = req.body;

    if (!garment_type || !measurements) {
        return res.status(400).json({ error: 'Garment type and measurements required' });
    }

    const result = db.prepare(`
    INSERT INTO measurement_profiles (customer_id, garment_type, label, measurements, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, garment_type, label, JSON.stringify(measurements), notes);

    const profile = db.prepare('SELECT * FROM measurement_profiles WHERE id = ?').get(result.lastInsertRowid);
    res.json({ measurement: profile });
});

// Update measurement profile
router.put('/measurements/:id', (req: AuthRequest, res) => {
    const { label, measurements, notes } = req.body;

    db.prepare(`
    UPDATE measurement_profiles SET label = ?, measurements = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(label, JSON.stringify(measurements), notes, req.params.id);

    const profile = db.prepare('SELECT * FROM measurement_profiles WHERE id = ?').get(req.params.id);
    res.json({ measurement: profile });
});


// Delete measurement profile
router.delete('/measurements/:id', (req: AuthRequest, res) => {
    db.prepare('DELETE FROM measurement_profiles WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// ========== Measurement Requests ==========

// Get requests for customer
router.get('/:id/requests', (req: AuthRequest, res) => {
    const requests = db.prepare(`
    SELECT r.*, u.full_name as created_by_name 
    FROM measurement_requests r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.customer_id = ? 
    ORDER BY r.created_at DESC
  `).all(req.params.id);
    res.json({ requests });
});

// Create request
router.post('/requests', (req: AuthRequest, res) => {
    const { customer_id, garment_type, requested_changes } = req.body;

    if (!customer_id || !garment_type || !requested_changes) {
        return res.status(400).json({ error: 'Customer, garment type, and changes required' });
    }

    const result = db.prepare(`
    INSERT INTO measurement_requests (customer_id, garment_type, requested_changes, created_by)
    VALUES (?, ?, ?, ?)
  `).run(customer_id, garment_type, requested_changes, req.user!.id);

    const request = db.prepare('SELECT * FROM measurement_requests WHERE id = ?').get(result.lastInsertRowid);
    res.json({ request });
});

// Update request status
router.put('/requests/:id', (req: AuthRequest, res) => {
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare('UPDATE measurement_requests SET status = ? WHERE id = ?').run(status, req.params.id);

    const request = db.prepare('SELECT * FROM measurement_requests WHERE id = ?').get(req.params.id);
    res.json({ request });
});

// ========== Customer Ledger ==========

// Get customer ledger (running account of payments, advances, and dues)
router.get('/:id/ledger', (req: AuthRequest, res) => {
    try {
        const customerId = req.params.id;

        const customer = db.prepare('SELECT id, customer_code, full_name, phone FROM customers WHERE id = ?').get(customerId);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        // Get all orders for this customer
        const orders = db.prepare(`
            SELECT id, order_number, garment_type, net_amount, advance_amount, balance_amount, status, created_at, delivery_date
            FROM orders WHERE customer_id = ? AND status != 'cancelled'
            ORDER BY created_at DESC
        `).all(customerId) as any[];

        // Get all payments for this customer's orders
        const payments = db.prepare(`
            SELECT p.id, p.order_id, p.amount, p.method, p.notes, p.created_at, o.order_number
            FROM payments p
            JOIN orders o ON p.order_id = o.id
            WHERE o.customer_id = ?
            ORDER BY p.created_at DESC
        `).all(customerId) as any[];

        // Calculate summary
        const totalBilled = orders.reduce((s: number, o: any) => s + (o.net_amount || 0), 0);
        const totalPaid = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
        const totalBalance = orders.reduce((s: number, o: any) => s + (o.balance_amount || 0), 0);

        // Build ledger entries (chronological)
        type LedgerEntry = { date: string; type: string; description: string; debit: number; credit: number; balance: number; order_number?: string };
        const ledger: LedgerEntry[] = [];
        let runningBalance = 0;

        // Combine orders and payments into a single timeline
        const events: { date: string; type: 'order' | 'payment'; data: any }[] = [];
        orders.forEach((o: any) => events.push({ date: o.created_at, type: 'order', data: o }));
        payments.forEach((p: any) => events.push({ date: p.created_at, type: 'payment', data: p }));
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        events.forEach(event => {
            if (event.type === 'order') {
                runningBalance += event.data.net_amount || 0;
                ledger.push({
                    date: event.data.created_at,
                    type: 'Order',
                    description: `${event.data.order_number} - ${event.data.garment_type}`,
                    debit: event.data.net_amount || 0,
                    credit: 0,
                    balance: runningBalance,
                    order_number: event.data.order_number
                });
            } else {
                runningBalance -= event.data.amount || 0;
                ledger.push({
                    date: event.data.created_at,
                    type: `Payment (${event.data.method})`,
                    description: `Payment for ${event.data.order_number}${event.data.notes ? ' - ' + event.data.notes : ''}`,
                    debit: 0,
                    credit: event.data.amount || 0,
                    balance: runningBalance,
                    order_number: event.data.order_number
                });
            }
        });

        res.json({
            customer,
            summary: { total_billed: totalBilled, total_paid: totalPaid, total_balance: totalBalance },
            ledger,
            orders,
            payments
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
