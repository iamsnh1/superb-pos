import { Router } from 'express';
import { db, generateNextNumber, getSetting } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List orders with filters
router.get('/', (req: AuthRequest, res) => {
  const { status, customer_id, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const branchId = req.user!.branch_id || 1;

  let query = `
    SELECT o.*, c.customer_code, c.full_name as customer_name, c.phone as customer_phone,
           t.full_name as tailor_name,
           m.measurements, m.label as measurement_label,
           inv.invoice_number
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users t ON o.assigned_tailor_id = t.id
    LEFT JOIN measurement_profiles m ON o.measurement_profile_id = m.id
    LEFT JOIN invoices inv ON o.invoice_id = inv.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role !== 'admin') {
    query += ` AND o.branch_id = ?`;
    params.push(branchId);
  }

  if (status && status !== 'all') {
    query += ` AND o.status = ?`;
    params.push(status);
  }

  if (customer_id) {
    query += ` AND o.customer_id = ?`;
    params.push(customer_id);
  }

  if (search) {
    query += ` AND (o.order_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
  const total = (db.prepare(countQuery).get(...params) as any).count;

  query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), offset);

  const orders = db.prepare(query).all(...params);

  res.json({ orders, total, page: Number(page), limit: Number(limit) });
});

// Get single order with full details
router.get('/:id', (req: AuthRequest, res) => {
  const order = db.prepare(`
    SELECT o.*, c.customer_code, c.full_name as customer_name, c.phone as customer_phone, c.address as customer_address,
           t.full_name as tailor_name,
           m.garment_type as measurement_garment_type, m.label as measurement_label, m.measurements,
           inv.invoice_number
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users t ON o.assigned_tailor_id = t.id
    LEFT JOIN measurement_profiles m ON o.measurement_profile_id = m.id
    LEFT JOIN invoices inv ON o.invoice_id = inv.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const timeline = db.prepare(`
    SELECT t.*, u.full_name as created_by_name
    FROM order_timeline t
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.order_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.id);

  const bom = db.prepare(`SELECT * FROM order_bom_items WHERE order_id = ?`).all(req.params.id);

  res.json({ order, timeline, bom });
});

// Create bulk orders
router.post('/bulk', roleMiddleware('admin', 'manager', 'pos_operator'), (req: AuthRequest, res) => {
  const { orders: ordersInput } = req.body;
  if (!Array.isArray(ordersInput) || ordersInput.length === 0) {
    return res.status(400).json({ error: 'orders array required with at least one order' });
  }
  const branchId = req.user!.branch_id || 1;
  const userId = req.user!.id;
  const created: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < ordersInput.length; i++) {
    const o = ordersInput[i];
    const {
      customer_id, garment_type, measurement_profile_id, fabric_source = 'inventory',
      fabric_item_id, assigned_tailor_id, priority = 'normal', delivery_date,
      delivery_type = 'pickup', total_amount = 0, notes, trial_date
    } = o;

    if (!customer_id || !garment_type) {
      errors.push(`Row ${i + 1}: customer and garment required`);
      continue;
    }

    const orderNumber = generateNextNumber(getSetting('order_prefix') || 'ORD', 'orders', 'order_number');
    let calcDeliveryDate = delivery_date;
    if (!calcDeliveryDate) {
      const days = priority === 'urgent' ? 3 : parseInt(getSetting('default_delivery_days') || '7', 10);
      const d = new Date();
      d.setDate(d.getDate() + days);
      calcDeliveryDate = d.toISOString().split('T')[0];
    }
    const netAmount = total_amount || 0;
    const balanceAmount = netAmount;

    try {
      const result = db.prepare(`
        INSERT INTO orders (
          order_number, customer_id, branch_id, garment_type, measurement_profile_id,
          fabric_source, fabric_item_id, design_specifications, assigned_tailor_id,
          status, priority, delivery_date, delivery_type, total_amount,
          tax_amount, net_amount, advance_amount, balance_amount, notes, created_by,
          trial_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, 'pending', ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, ?)
      `).run(
        orderNumber, customer_id, branchId, garment_type, measurement_profile_id || null,
        fabric_source, fabric_item_id || null, assigned_tailor_id || null,
        priority, calcDeliveryDate, delivery_type, total_amount, netAmount, balanceAmount,
        notes || null, userId, trial_date || null
      );
      const orderId = result.lastInsertRowid;
      db.prepare(`
        INSERT INTO order_timeline (order_id, status, notes, created_by)
        VALUES (?, 'pending', 'Order created (bulk)', ?)
      `).run(orderId, userId);
      created.push({ id: orderId, order_number: orderNumber });
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  res.json({
    created: created.length,
    orders: created,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// Create order
router.post('/', roleMiddleware('admin', 'manager', 'pos_operator'), (req: AuthRequest, res) => {
  const {
    customer_id, garment_type, measurement_profile_id, fabric_source = 'inventory',
    fabric_item_id, design_specifications, assigned_tailor_id, priority = 'normal',
    delivery_date, delivery_type = 'pickup', total_amount = 0, discount_amount = 0,
    tax_amount = 0, advance_amount = 0, notes, trial_date, fitting_notes
  } = req.body;

  const branchId = req.user!.branch_id || 1;
  const orderNumber = generateNextNumber(getSetting('order_prefix') || 'ORD', 'orders', 'order_number');

  // Calculate amounts
  const netAmount = total_amount - discount_amount + tax_amount;
  const balanceAmount = netAmount - advance_amount;

  // Calculate delivery date if not provided
  let calcDeliveryDate = delivery_date;
  if (!calcDeliveryDate) {
    const days = priority === 'urgent' ? 3 : parseInt(getSetting('default_delivery_days') || '7', 10);
    const date = new Date();
    date.setDate(date.getDate() + days);
    calcDeliveryDate = date.toISOString().split('T')[0];
  }

  const result = db.prepare(`
    INSERT INTO orders (
      order_number, customer_id, branch_id, garment_type, measurement_profile_id,
      fabric_source, fabric_item_id, design_specifications, assigned_tailor_id,
      status, priority, delivery_date, delivery_type, total_amount, discount_amount,
      tax_amount, net_amount, advance_amount, balance_amount, notes, created_by,
      trial_date, fitting_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderNumber, customer_id, branchId, garment_type, measurement_profile_id,
    fabric_source, fabric_item_id, JSON.stringify(design_specifications || {}),
    assigned_tailor_id, priority, calcDeliveryDate, delivery_type, total_amount,
    discount_amount, tax_amount, netAmount, advance_amount, balanceAmount,
    notes, req.user!.id, trial_date, fitting_notes
  );

  const orderId = result.lastInsertRowid;

  // Add timeline entry
  db.prepare(`
    INSERT INTO order_timeline (order_id, status, notes, created_by)
    VALUES (?, 'pending', 'Order created', ?)
  `).run(orderId, req.user!.id);

  // 1. Add Main Fabric to BOM (if selected from inventory)
  if (fabric_source === 'inventory' && fabric_item_id) {
    const fabricQty = 2.5; // Default, in future calculate based on garment/measurements

    // Add to BOM
    db.prepare(`
            INSERT INTO order_bom_items (order_id, item_id, item_name, required_quantity, allocated_quantity, unit, branch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(orderId, fabric_item_id, 'Main Fabric', fabricQty, fabricQty, 'meters', branchId);

    // Reserve Stock
    db.prepare(`
            INSERT INTO stock_levels (item_id, branch_id, reserved_quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(item_id, branch_id) DO UPDATE SET
            reserved_quantity = reserved_quantity + ?
        `).run(fabric_item_id, branchId, fabricQty, fabricQty);
  }

  // 2. Auto-generate auxiliary BOM items from template
  const template = db.prepare(`
    SELECT id FROM bom_templates WHERE garment_type = ? AND is_active = 1
  `).get(garment_type) as { id: number } | undefined;

  if (template) {
    const templateItems = db.prepare(`
      SELECT * FROM bom_template_items WHERE template_id = ?
    `).all(template.id) as any[];

    for (const item of templateItems) {
      // Add BOM item
      db.prepare(`
        INSERT INTO order_bom_items (order_id, item_id, item_name, required_quantity, allocated_quantity, unit, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(orderId, item.item_id, item.item_name, item.default_quantity, item.default_quantity, item.unit, branchId);

      // Reserve Stock if inventory item linked
      if (item.item_id) {
        db.prepare(`
                    INSERT INTO stock_levels (item_id, branch_id, reserved_quantity)
                    VALUES (?, ?, ?)
                    ON CONFLICT(item_id, branch_id) DO UPDATE SET
                    reserved_quantity = reserved_quantity + ?
                `).run(item.item_id, branchId, item.default_quantity, item.default_quantity);
      }
    }
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({ order });
});

// Update order
router.put('/:id', roleMiddleware('admin', 'manager', 'pos_operator'), (req: AuthRequest, res) => {
  const {
    garment_type, measurement_profile_id, fabric_source, fabric_item_id,
    design_specifications, assigned_tailor_id, priority, delivery_date,
    delivery_type, total_amount, discount_amount, tax_amount, advance_amount, notes
  } = req.body;

  const netAmount = total_amount - discount_amount + tax_amount;
  const balanceAmount = netAmount - advance_amount;

  db.prepare(`
    UPDATE orders SET
      garment_type = ?, measurement_profile_id = ?, fabric_source = ?, fabric_item_id = ?,
      design_specifications = ?, assigned_tailor_id = ?, priority = ?, delivery_date = ?,
      delivery_type = ?, total_amount = ?, discount_amount = ?, tax_amount = ?,
      net_amount = ?, advance_amount = ?, balance_amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    garment_type, measurement_profile_id, fabric_source, fabric_item_id,
    JSON.stringify(design_specifications || {}), assigned_tailor_id, priority,
    delivery_date, delivery_type, total_amount, discount_amount, tax_amount,
    netAmount, advance_amount, balanceAmount, notes, req.params.id
  );

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ order });
});

// Update order status
router.patch('/:id/status', authMiddleware, (req: AuthRequest, res) => {
  const { status, notes, cancellation_reason } = req.body;

  if (status === 'cancelled' && !cancellation_reason) {
    return res.status(400).json({ error: 'Cancellation reason required' });
  }

  db.prepare(`
    UPDATE orders SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, cancellation_reason || null, req.params.id);

  // Add timeline entry
  db.prepare(`
    INSERT INTO order_timeline (order_id, status, notes, created_by)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, status, notes || cancellation_reason || `Status changed to ${status}`, req.user!.id);

  // Auto-create Manufacturing Order (MO) if status implies start of production
  if (['measurement_confirmed', 'in_production'].includes(status)) {
    const existingMO = db.prepare('SELECT id FROM manufacturing_orders WHERE order_id = ?').get(req.params.id);
    if (!existingMO) {
      const moNumber = generateNextNumber('MO', 'manufacturing_orders', 'mo_number');
      const orderInfo = db.prepare('SELECT assigned_tailor_id, notes FROM orders WHERE id = ?').get(req.params.id) as any;

      db.prepare(`
            INSERT INTO manufacturing_orders (mo_number, order_id, assigned_tailor_id, status, work_instructions)
            VALUES (?, ?, ?, 'pending', ?)
        `).run(moNumber, req.params.id, orderInfo.assigned_tailor_id, orderInfo.notes);
    }
  }

  // ==========================================
  // 🚀 AUTOMATED WHATSAPP ENGINE (WEBHOOK)
  // ==========================================
  if (['ready_for_trial', 'ready_for_delivery', 'delivered'].includes(status)) {
    try {
        const webhookUrl = getSetting('whatsapp_reminder_webhook');
        if (webhookUrl) {
            const orderDetails = db.prepare(`
                SELECT o.order_number, o.garment_type, c.full_name, c.phone
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.id = ?
            `).get(req.params.id) as any;
            
            if (orderDetails && orderDetails.phone) {
                const businessName = getSetting('business_name') || 'Superb Tailors';
                let message = '';
                
                if (status === 'ready_for_trial') {
                    message = `Hi ${orderDetails.full_name}, your ${orderDetails.garment_type} (Order ${orderDetails.order_number}) is ready for trial! Please visit us soon. Thank you - ${businessName}`;
                } else if (status === 'ready_for_delivery') {
                    message = `Hi ${orderDetails.full_name}, your ${orderDetails.garment_type} (Order ${orderDetails.order_number}) is completely ready for delivery! Please come collect it. Thank you - ${businessName}`;
                } else if (status === 'delivered') {
                    message = `Hi ${orderDetails.full_name}, thank you for taking delivery of your ${orderDetails.garment_type} (Order ${orderDetails.order_number}). We hope you love the fit! - ${businessName}`;
                }
                
                // Fire and forget webhook
                if (message) {
                    fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            date: new Date().toISOString(),
                            type: `order_status_${status}`,
                            phone: orderDetails.phone,
                            message,
                            customer_name: orderDetails.full_name,
                            order_number: orderDetails.order_number,
                            event: "dashboard_status_change"
                        }),
                    }).catch(e => console.error('[WhatsApp Engine Webhook Error]', e.message));
                    
                    console.log(`[WhatsApp Engine] Fired webhook for Order ${orderDetails.order_number} (${status})`);
                }
            }
        }
    } catch(e: any) {
        console.error('[WhatsApp Engine Error]', e.message);
    }
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ order });
});

// Get tailors for assignment
router.get('/meta/tailors', (req: AuthRequest, res) => {
  const branchId = req.user!.branch_id || 1;
  const tailors = db.prepare(`
    SELECT id, full_name, email FROM users WHERE role = 'tailor' AND is_active = 1 AND (branch_id = ? OR branch_id IS NULL)
  `).all(branchId);
  res.json({ tailors });
});

export default router;
