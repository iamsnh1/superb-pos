import { Router } from 'express';
import { db, getSetting } from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Get reminders for trial and delivery dates (for WhatsApp)
router.get('/reminders', (req: AuthRequest, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const branchId = req.user!.branch_id || 1;
    const businessName = getSetting('business_name') || 'TailorFlow Pro';

    const trialOrders = db.prepare(`
      SELECT o.id, o.order_number, o.trial_date, o.garment_type,
             c.full_name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.branch_id = ? AND DATE(o.trial_date) = DATE(?)
        AND o.status NOT IN ('delivered', 'cancelled')
      ORDER BY o.trial_date ASC
    `).all(branchId, date) as any[];

    const deliveryOrders = db.prepare(`
      SELECT o.id, o.order_number, o.delivery_date, o.garment_type,
             c.full_name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.branch_id = ? AND DATE(o.delivery_date) = DATE(?)
        AND o.status NOT IN ('delivered', 'cancelled')
      ORDER BY o.delivery_date ASC
    `).all(branchId, date) as any[];

    const trialReminders = trialOrders.map(o => ({
      ...o,
      type: 'trial',
      message: `Hi ${o.customer_name}, this is a reminder that your *trial* for order *${o.order_number}* (${o.garment_type}) is scheduled for *today*. Please visit us at your convenience. Thank you - ${businessName}`,
    }));

    const deliveryReminders = deliveryOrders.map(o => ({
      ...o,
      type: 'delivery',
      message: `Hi ${o.customer_name}, your order *${o.order_number}* (${o.garment_type}) is ready for delivery *today*. Please collect from our store, or we will deliver as per schedule. Thank you - ${businessName}`,
    }));

    res.json({ trialReminders, deliveryReminders, date });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all trials (First Fittings)
router.get('/trials', (req: AuthRequest, res) => {
    try {
        const branchId = req.user!.branch_id || 1;
        const trials = db.prepare(`
            SELECT o.id, o.order_number, o.trial_date, o.trial_status, o.garment_type, o.fitting_notes,
                   c.full_name as customer_name, c.phone as customer_phone
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.branch_id = ? AND o.trial_date IS NOT NULL
            ORDER BY o.trial_date ASC
        `).all(branchId);
        res.json({ trials });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update Trial Status
router.put('/trials/:orderId', (req: AuthRequest, res) => {
    try {
        const { trial_status, fitting_notes, trial_date } = req.body;
        const updates: string[] = [];
        const params: any[] = [];

        if (trial_status) { updates.push('trial_status = ?'); params.push(trial_status); }
        if (fitting_notes !== undefined) { updates.push('fitting_notes = ?'); params.push(fitting_notes); }
        if (trial_date) { updates.push('trial_date = ?'); params.push(trial_date); }

        if (updates.length > 0) {
            const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`;
            params.push(req.params.orderId);
            db.prepare(query).run(...params);
        }
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get all deliveries
router.get('/tracking', (req: AuthRequest, res) => {
    try {
        const branchId = req.user!.branch_id || 1;
        const deliveries = db.prepare(`
            SELECT o.id, o.order_number, o.status, o.delivery_status, o.delivery_date, o.delivery_type, 
                   o.delivery_proof_url, o.delivery_person_id,
                   c.full_name as customer_name, c.phone as customer_phone,
                   u.full_name as delivery_person_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON o.delivery_person_id = u.id
            WHERE o.branch_id = ? AND (o.delivery_type = 'home_delivery' OR o.status = 'ready')
            ORDER BY o.delivery_date ASC
        `).all(branchId);
        res.json({ deliveries });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update Delivery Status
router.put('/tracking/:orderId', (req: AuthRequest, res) => {
    try {
        const { delivery_status, delivery_person_id, status } = req.body;
        const updates: string[] = [];
        const params: any[] = [];

        if (delivery_status) { updates.push('delivery_status = ?'); params.push(delivery_status); }
        if (delivery_person_id !== undefined) { updates.push('delivery_person_id = ?'); params.push(delivery_person_id); }
        if (status) { updates.push('status = ?'); params.push(status); }

        if (updates.length > 0) {
            const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`;
            params.push(req.params.orderId);
            db.prepare(query).run(...params);
        }
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get delivery persons
router.get('/persons', (req: AuthRequest, res) => {
    try {
        const branchId = req.user!.branch_id || 1;
        const persons = db.prepare(`
            SELECT id, full_name, role FROM users 
            WHERE branch_id = ? AND role = 'delivery_person'
        `).all(branchId);
        res.json({ persons });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
