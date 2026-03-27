import { Router } from 'express';
import { db, generateNextNumber, getSetting } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List manufacturing orders (MOs)
router.get('/', (req: AuthRequest, res) => {
    try {
        const { status, tailor_id } = req.query;

        // Explicit column selection to avoid collisions and 500s
        let query = `
            SELECT mo.id, mo.mo_number, mo.status, mo.order_id, mo.assigned_tailor_id,
                   mo.priority, mo.work_instructions, mo.created_at,
                   o.order_number, o.garment_type, o.delivery_date, o.priority as order_priority,
                   c.full_name as customer_name, c.phone as customer_phone,
                   t.full_name as tailor_name
            FROM manufacturing_orders mo
            LEFT JOIN orders o ON mo.order_id = o.id
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users t ON mo.assigned_tailor_id = t.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (status) {
            query += ` AND mo.status = ?`;
            params.push(status);
        }

        if (tailor_id) {
            query += ` AND mo.assigned_tailor_id = ?`;
            params.push(tailor_id);
        }

        query += ` ORDER BY mo.created_at DESC`;

        const mos = db.prepare(query).all(...params);

        res.json({
            mos: mos,
            total: mos.length,
            page: 1,
            limit: 100
        });
    } catch (err: any) {
        console.error('Production API Error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Get single MO details
router.get('/:id', (req: AuthRequest, res) => {
    try {
        const mo = db.prepare(`
            SELECT mo.*, o.order_number, o.garment_type, o.design_specifications, o.delivery_date, o.priority as order_priority,
                   c.full_name as customer_name,
                   t.full_name as tailor_name
            FROM manufacturing_orders mo
            JOIN orders o ON mo.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users t ON mo.assigned_tailor_id = t.id
            WHERE mo.id = ?
        `).get(req.params.id);

        if (!mo) return res.status(404).json({ error: 'MO not found' });

        if ((mo as any).design_specifications && typeof (mo as any).design_specifications === 'string') {
            try {
                (mo as any).design_specifications = JSON.parse((mo as any).design_specifications);
            } catch (e) { }
        }

        res.json({ mo });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Update MO
router.put('/:id', roleMiddleware('admin', 'manager', 'tailor'), (req: AuthRequest, res) => {
    try {
        const { status, assigned_tailor_id, work_instructions, qc_notes, qc_passed, labor_cost } = req.body;
        const updates: string[] = [];
        const params: any[] = [];

        if (status) {
            updates.push('status = ?');
            params.push(status);
            if (status === 'cutting' || status === 'stitching') {
                updates.push('start_date = COALESCE(start_date, CURRENT_TIMESTAMP)');
            }
            if (status === 'completed') {
                updates.push('completion_date = CURRENT_TIMESTAMP');
            }
        }
        if (assigned_tailor_id !== undefined) {
            updates.push('assigned_tailor_id = ?');
            params.push(assigned_tailor_id);
        }
        if (work_instructions !== undefined) {
            updates.push('work_instructions = ?');
            params.push(work_instructions);
        }
        if (qc_notes !== undefined) {
            updates.push('qc_notes = ?');
            params.push(qc_notes);
        }
        if (qc_passed !== undefined) {
            updates.push('qc_passed = ?');
            params.push(qc_passed);
        }
        if (labor_cost !== undefined) {
            updates.push('labor_cost = ?');
            params.push(labor_cost);
        }

        if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP');
            const query = `UPDATE manufacturing_orders SET ${updates.join(', ')} WHERE id = ?`;
            params.push(req.params.id);
            db.prepare(query).run(...params);

            // ==========================================
            // 🚀 AUTOMATED WHATSAPP ENGINE (WEBHOOK)
            // ==========================================
            if (status === 'completed') {
                try {
                    const webhookUrl = getSetting('whatsapp_reminder_webhook');
                    if (webhookUrl) {
                        const orderDetails = db.prepare(`
                            SELECT o.order_number, o.garment_type, c.full_name, c.phone
                            FROM manufacturing_orders mo
                            JOIN orders o ON mo.order_id = o.id
                            JOIN customers c ON o.customer_id = c.id
                            WHERE mo.id = ?
                        `).get(req.params.id) as any;
                        
                        if (orderDetails && orderDetails.phone) {
                            const businessName = getSetting('business_name') || 'Superb Tailors';
                            const message = `Hi ${orderDetails.full_name}, your ${orderDetails.garment_type} (Order ${orderDetails.order_number}) is fully stitched and ready for trial/delivery. Thank you - ${businessName}`;
                            
                            // Fire and forget webhook
                            fetch(webhookUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    date: new Date().toISOString(),
                                    type: 'order_completed',
                                    phone: orderDetails.phone,
                                    message,
                                    customer_name: orderDetails.full_name,
                                    order_number: orderDetails.order_number,
                                    event: "karigar_completed"
                                }),
                            }).catch(e => console.error('[WhatsApp Engine Webhook Error]', e.message));
                            
                            console.log(`[WhatsApp Engine] Fired webhook for Order ${orderDetails.order_number}`);
                        }
                    }
                } catch(e: any) {
                    console.error('[WhatsApp Engine Error]', e.message);
                }
            }
        }

        const mo = db.prepare('SELECT * FROM manufacturing_orders WHERE id = ?').get(req.params.id);
        res.json({ mo });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Create manual MO
router.post('/', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    try {
        const { order_id } = req.body;
        if (!order_id) return res.status(400).json({ error: 'Order ID required' });

        const existing = db.prepare('SELECT id FROM manufacturing_orders WHERE order_id = ?').get(order_id);
        if (existing) return res.status(400).json({ error: 'MO already exists for this order' });

        const moNumber = generateNextNumber('MO', 'manufacturing_orders', 'mo_number');
        const order = db.prepare('SELECT assigned_tailor_id, notes, priority FROM orders WHERE id = ?').get(order_id) as any;

        const result = db.prepare(`
            INSERT INTO manufacturing_orders (mo_number, order_id, assigned_tailor_id, status, work_instructions, priority)
            VALUES (?, ?, ?, 'pending', ?, ?)
        `).run(moNumber, order_id, order?.assigned_tailor_id || null, order?.notes || '', order?.priority || 'normal');

        const mo = db.prepare('SELECT * FROM manufacturing_orders WHERE id = ?').get(result.lastInsertRowid);
        res.json({ mo });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

export default router;
