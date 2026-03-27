import { Router } from 'express';
import { db, generateNextNumber, getSetting } from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Create POS Transaction (Multi-item Order)
router.post('/transaction', (req: AuthRequest, res) => {
    const {
        customer_id,
        items, // Array of { garment_type, fabric_item_id, design_specifications, measurements, price, etc. }
        payment, // { method, amount, reference, split_payment: [] }
        discount_total = 0,
        tax_total = 0,
        cgst_rate = 0,
        cgst_amount = 0,
        sgst_rate = 0,
        sgst_amount = 0,
        grand_total,
        advance_amount,
        notes
    } = req.body;

    const branchId = req.user!.branch_id || 1;
    const userId = req.user!.id;

    console.log('=== POS Transaction Debug ===');
    console.log('customer_id:', customer_id);
    console.log('branchId:', branchId);
    console.log('userId:', userId);
    console.log('items:', JSON.stringify(items, null, 2));
    console.log('payment:', payment);
    console.log('grand_total:', grand_total);

    // Start Transaction
    const transaction = db.transaction(() => {
        const orderIds: number[] = [];
        const groupId = `GRP-${Date.now()}`;

        // 1. Create Orders for each Item FIRST
        for (const [index, item] of items.entries()) {
            const orderNumber = generateNextNumber('none', 'orders', 'order_number', false);
            console.log(`Processing item ${index + 1}: ${item.garment_type} (${orderNumber})`);

            // Calculate Item Delivery Date
            let deliveryDate = item.delivery_date;
            if (!deliveryDate) {
                const days = item.priority === 'urgent' ? 3 : parseInt(getSetting('default_delivery_days') || '7', 10);
                const date = new Date();
                date.setDate(date.getDate() + days);
                deliveryDate = date.toISOString().split('T')[0];
            }

            try {
                const params = [
                    orderNumber,
                    customer_id,
                    branchId,
                    item.garment_type,
                    item.measurement_profile_id || null,
                    item.fabric_source || 'customer',
                    item.fabric_item_id || null,
                    JSON.stringify(item.design_specifications || item.design_notes || ''),
                    JSON.stringify(item.measurements || {}),
                    item.assigned_tailor_id || null,
                    item.priority || 'normal',
                    deliveryDate,
                    item.delivery_type || 'pickup',
                    item.price,
                    0,
                    0,
                    item.price,
                    0,
                    item.price,
                    item.notes || '',
                    userId,
                    groupId,
                    item.trial_date || null
                ];
                console.log('Order Insert Params:', params);

                // Insert Order
                const designSpec = JSON.stringify({
                    style: item.style || '',
                    notes: (typeof item.design_specifications === 'string' ? item.design_specifications : item.design_notes) || '',
                    ...(typeof item.design_specifications === 'object' && item.design_specifications ? item.design_specifications : {})
                });
                const orderRes = db.prepare(`
                    INSERT INTO orders (
                        order_number, customer_id, branch_id,
                        garment_type, qty,
                        measurement_profile_id, fabric_source, fabric_item_id,
                        design_specifications, measurements, assigned_tailor_id,
                        status, priority, delivery_date, delivery_type,
                        total_amount, tax_amount, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
                        discount_amount, net_amount,
                        advance_amount, balance_amount, notes,
                        created_by, group_id, trial_date
                    ) VALUES (
                        ?, ?, ?,
                        ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        'pending', ?, ?, ?,
                        ?, ?, ?, ?, ?, ?,
                        ?, ?,
                        ?, ?, ?,
                        ?, ?, ?
                    )
                `).run(
                    orderNumber, customer_id, branchId,
                    item.garment_type, item.qty || 1,
                    item.measurement_profile_id || null, item.fabric_source || 'customer', item.fabric_item_id || null,
                    designSpec, JSON.stringify(item.measurements || {}), item.assigned_tailor_id || null,
                    item.priority || 'normal', deliveryDate, item.delivery_type || 'pickup',
                    item.price * (item.qty || 1), 0, 0, 0, 0, 0, 0, item.price * (item.qty || 1),
                    0, item.price * (item.qty || 1), item.notes || '',
                    userId, groupId, item.trial_date || null
                );

                const orderId = Number(orderRes.lastInsertRowid);
                orderIds.push(orderId);
                console.log(`Inserted order successfully. ID: ${orderId}`);

                // Create Manufacturing Order (MO) automatically
                const moNumber = generateNextNumber('MO', 'manufacturing_orders', 'mo_number');
                db.prepare(`
                    INSERT INTO manufacturing_orders (mo_number, order_id, status, priority, work_instructions, created_at)
                    VALUES (?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP)
                `).run(moNumber, orderId, item.priority || 'normal', item.notes || '');

                // Add Timeline
                db.prepare(`
                    INSERT INTO order_timeline (order_id, status, notes, created_by)
                    VALUES (?, 'pending', 'Created via POS', ?)
                `).run(orderId, userId);

                // Handle Inventory Reservation (Fabric)
                if (item.fabric_source === 'inventory' && item.fabric_item_id) {
                    const qty = item.fabric_quantity || 2.5;
                    db.prepare(`
                        INSERT INTO order_bom_items (order_id, item_id, item_name, required_quantity, allocated_quantity, unit, branch_id)
                        VALUES (?, ?, ?, ?, ?, 'meters', ?)
                    `).run(orderId, item.fabric_item_id, 'Main Fabric', qty, qty, branchId);

                    db.prepare(`
                        UPDATE stock_levels SET reserved_quantity = reserved_quantity + ? WHERE item_id = ? AND branch_id = ?
                    `).run(qty, item.fabric_item_id, branchId);
                }
            } catch (err: any) {
                console.error(`Error during order/timeline/BOM insert for item ${index}:`, err.message);
                throw err;
            }
        }

        const firstOrderId = orderIds[0];
        if (!firstOrderId) throw new Error("No orders created");

        // 2. Generate Invoice Number and Create Invoice
        const invoiceNumber = generateNextNumber('none', 'invoices', 'invoice_number', false);
        console.log(`Creating invoice: ${invoiceNumber} for order ${firstOrderId}`);

        try {
            const invoiceParams = [invoiceNumber, firstOrderId, grand_total - tax_total + discount_total, discount_total, tax_total, grand_total, notes];
            console.log('Invoice Insert Params:', invoiceParams);

            const invoiceRes = db.prepare(`
                INSERT INTO invoices (invoice_number, order_id, subtotal, tax_amount, cgst_rate, cgst_amount, sgst_rate, sgst_amount, discount_amount, total_amount, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(invoiceNumber, firstOrderId, grand_total - tax_total + discount_total, tax_total, cgst_rate, cgst_amount, sgst_rate, sgst_amount, discount_total, grand_total, notes);

            const invoiceId = invoiceRes.lastInsertRowid;
            console.log(`Invoice created successfully. ID: ${invoiceId}`);

            // 3. Update all orders with invoice_id
            for (const orderId of orderIds) {
                db.prepare('UPDATE orders SET invoice_id = ? WHERE id = ?').run(invoiceId, orderId);
            }

            // 4. Create Payment Record(s) and Update Orders
            if (payment && payment.amount > 0) {
                console.log(`Recording payment of ${payment.amount} for first order ${firstOrderId}`);

                // Create Payment Record
                if (payment.split_payment && payment.split_payment.length > 0) {
                    for (const p of payment.split_payment) {
                        const pParams = [firstOrderId, invoiceId, p.amount, p.method, p.reference || null, 'Split Payment', userId];
                        db.prepare(`
                            INSERT INTO payments (order_id, invoice_id, amount, method, reference, notes, collected_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `).run(...pParams);
                    }
                } else {
                    const pParams = [firstOrderId, invoiceId, payment.amount, payment.method, payment.reference || null, 'POS Payment', userId];
                    db.prepare(`
                        INSERT INTO payments (order_id, invoice_id, amount, method, reference, notes, collected_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(...pParams);
                }

                // Update orders with Distributed Advance
                let remainingAdvance = payment.amount;
                for (const orderId of orderIds) {
                    if (remainingAdvance <= 0) break;

                    const order = db.prepare('SELECT net_amount FROM orders WHERE id = ?').get(orderId) as any;
                    const advanceForThisOrder = Math.min(remainingAdvance, order.net_amount);

                    db.prepare(`
                        UPDATE orders 
                        SET advance_amount = ?, balance_amount = ? 
                        WHERE id = ?
                    `).run(advanceForThisOrder, order.net_amount - advanceForThisOrder, orderId);

                    remainingAdvance -= advanceForThisOrder;
                }
            }

            return { invoiceNumber, invoiceId, itemsCount: items.length, orderIds };
        } catch (err: any) {
            console.error("Error during invoice/update/payment step:", err.message);
            throw err;
        }
    });

    try {
        const result = transaction();
        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error('POS Transaction Failed at SQL:', error);
        // Log more details about the error
        if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            console.error('FOREIGN KEY CONSTRAINT FAILED. Checking possible causes...');
            console.error('Payload was:', JSON.stringify({ customer_id, items, payment, grand_total }, null, 2));
        }
        res.status(500).json({
            error: error.message,
            details: error.code,
            success: false
        });
    }
});

export default router;
