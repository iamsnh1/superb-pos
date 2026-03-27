import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List appointments with filters
router.get('/', (req: AuthRequest, res) => {
    try {
        const { date, order_id, customer_id, status, page = 1, limit = 50 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const branchId = req.user!.branch_id || 1;

        let query = `
      SELECT fa.*, o.order_number, o.garment_type, c.full_name as customer_name, c.phone as customer_phone
      FROM fitting_appointments fa
      JOIN orders o ON fa.order_id = o.id
      JOIN customers c ON fa.customer_id = c.id
      WHERE fa.branch_id = ?
    `;
        const params: any[] = [branchId];

        if (date) {
            query += ` AND fa.appointment_date = ?`;
            params.push(date);
        }
        if (order_id) {
            query += ` AND fa.order_id = ?`;
            params.push(order_id);
        }
        if (customer_id) {
            query += ` AND fa.customer_id = ?`;
            params.push(customer_id);
        }
        if (status) {
            query += ` AND fa.status = ?`;
            params.push(status);
        }

        const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM');
        const total = (db.prepare(countQuery).get(...params) as any).count;

        query += ` ORDER BY fa.appointment_date ASC, fa.appointment_time ASC LIMIT ? OFFSET ?`;
        params.push(Number(limit), offset);

        const appointments = db.prepare(query).all(...params);
        res.json({ appointments, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get slots for a specific date (availability view)
router.get('/slots', (req: AuthRequest, res) => {
    try {
        const { date } = req.query;
        const branchId = req.user!.branch_id || 1;

        if (!date) return res.status(400).json({ error: 'Date is required' });

        const booked = db.prepare(`
      SELECT appointment_time, duration_minutes, type, status, id
      FROM fitting_appointments
      WHERE branch_id = ? AND appointment_date = ? AND status NOT IN ('cancelled')
      ORDER BY appointment_time ASC
    `).all(branchId, date);

        // Generate standard time slots (9 AM to 7 PM, every 30 min)
        const slots: { time: string; available: boolean; appointment_id?: number }[] = [];
        for (let h = 9; h <= 19; h++) {
            for (const m of ['00', '30']) {
                if (h === 19 && m === '30') continue;
                const time = `${String(h).padStart(2, '0')}:${m}`;
                const taken = booked.find((b: any) => b.appointment_time === time);
                slots.push({
                    time,
                    available: !taken,
                    appointment_id: taken ? (taken as any).id : undefined
                });
            }
        }

        res.json({ date, slots, booked });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Create appointment
router.post('/', (req: AuthRequest, res) => {
    try {
        const { order_id, appointment_date, appointment_time, duration_minutes = 30, type = 'first_fitting', notes } = req.body;
        const branchId = req.user!.branch_id || 1;

        if (!order_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ error: 'Order, date, and time are required' });
        }

        // Get order to extract customer_id
        const order = db.prepare('SELECT customer_id FROM orders WHERE id = ?').get(order_id) as any;
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Check for conflicting slot
        const conflict = db.prepare(`
      SELECT id FROM fitting_appointments
      WHERE branch_id = ? AND appointment_date = ? AND appointment_time = ? AND status NOT IN ('cancelled')
    `).get(branchId, appointment_date, appointment_time);

        if (conflict) {
            return res.status(409).json({ error: 'This time slot is already booked' });
        }

        const result = db.prepare(`
      INSERT INTO fitting_appointments (order_id, customer_id, branch_id, appointment_date, appointment_time, duration_minutes, type, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(order_id, order.customer_id, branchId, appointment_date, appointment_time, duration_minutes, type, notes, req.user!.id);

        const appointment = db.prepare(`
      SELECT fa.*, o.order_number, c.full_name as customer_name
      FROM fitting_appointments fa
      JOIN orders o ON fa.order_id = o.id
      JOIN customers c ON fa.customer_id = c.id
      WHERE fa.id = ?
    `).get(result.lastInsertRowid);

        res.json({ appointment });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update appointment status
router.patch('/:id', (req: AuthRequest, res) => {
    try {
        const { status, notes, appointment_date, appointment_time } = req.body;

        const updates: string[] = [];
        const params: any[] = [];

        if (status) { updates.push('status = ?'); params.push(status); }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
        if (appointment_date) { updates.push('appointment_date = ?'); params.push(appointment_date); }
        if (appointment_time) { updates.push('appointment_time = ?'); params.push(appointment_time); }

        updates.push('updated_at = CURRENT_TIMESTAMP');

        if (updates.length <= 1) return res.status(400).json({ error: 'Nothing to update' });

        params.push(req.params.id);
        db.prepare(`UPDATE fitting_appointments SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const appointment = db.prepare(`
      SELECT fa.*, o.order_number, c.full_name as customer_name
      FROM fitting_appointments fa
      JOIN orders o ON fa.order_id = o.id
      JOIN customers c ON fa.customer_id = c.id
      WHERE fa.id = ?
    `).get(req.params.id);

        res.json({ appointment });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete appointment
router.delete('/:id', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    db.prepare('DELETE FROM fitting_appointments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

export default router;
