import { Router } from 'express';
import * as XLSX from 'xlsx';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'manager'));

router.get('/all', (req: AuthRequest, res) => {
  const branchId = req.user!.branch_id ?? 1;
  const isAdmin = req.user!.role === 'admin';

  // Fetch all data (high limit for full export)
  const limit = 10000;

  const customers = db.prepare(`
    SELECT id, customer_code, full_name, phone, email, address, notes, created_at
    FROM customers
    WHERE 1=1 ${!isAdmin ? 'AND branch_id = ?' : ''}
    ORDER BY created_at DESC LIMIT ?
  `).all(...(!isAdmin ? [branchId, limit] : [limit])) as any[];

  const orders = db.prepare(`
    SELECT o.id, o.order_number, o.customer_id, c.full_name as customer_name, o.garment_type, o.status,
           o.total_amount, o.net_amount, o.advance_amount, o.balance_amount, o.delivery_date, o.created_at
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.branch_id = ? OR ? = 1
    ORDER BY o.created_at DESC LIMIT ?
  `).all(branchId, isAdmin ? 1 : 0, limit) as any[];

  const invoices = db.prepare(`
    SELECT i.*, o.order_number, c.full_name as customer_name
    FROM invoices i
    JOIN orders o ON i.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    WHERE o.branch_id = ?
    ORDER BY i.created_at DESC LIMIT ?
  `).all(branchId, limit) as any[];

  const payments = db.prepare(`
    SELECT p.*, o.order_number, c.full_name as customer_name
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    WHERE o.branch_id = ?
    ORDER BY p.created_at DESC LIMIT ?
  `).all(branchId, limit) as any[];

  const inventoryItems = db.prepare(`
    SELECT ii.id, ii.item_code, ii.name, ii.description, ii.unit, ic.name as category_name,
           COALESCE(SUM(sl.quantity), 0) as quantity
    FROM inventory_items ii
    LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
    LEFT JOIN stock_levels sl ON ii.id = sl.item_id
    WHERE ii.is_active = 1
    GROUP BY ii.id
    ORDER BY ii.name LIMIT ?
  `).all(limit) as any[];

  const deliveries = db.prepare(`
    SELECT d.*, o.order_number, c.full_name as customer_name
    FROM deliveries d
    JOIN orders o ON d.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    WHERE o.branch_id = ?
    ORDER BY d.scheduled_date DESC LIMIT ?
  `).all(branchId, limit) as any[];

  const expenses = db.prepare(`
    SELECT e.*, ec.name as category_name
    FROM expenses e
    LEFT JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.branch_id = ?
    ORDER BY e.expense_date DESC LIMIT ?
  `).all(branchId, limit) as any[];

  const wb = XLSX.utils.book_new();

  const toSheet = (data: any[]) => {
    if (!data.length) return XLSX.utils.aoa_to_sheet([['No data']]);
    return XLSX.utils.json_to_sheet(data);
  };

  XLSX.utils.book_append_sheet(wb, toSheet(customers), 'Customers');
  XLSX.utils.book_append_sheet(wb, toSheet(orders), 'Orders');
  XLSX.utils.book_append_sheet(wb, toSheet(invoices), 'Invoices');
  XLSX.utils.book_append_sheet(wb, toSheet(payments), 'Payments');
  XLSX.utils.book_append_sheet(wb, toSheet(inventoryItems), 'Inventory');
  XLSX.utils.book_append_sheet(wb, toSheet(deliveries), 'Deliveries');
  XLSX.utils.book_append_sheet(wb, toSheet(expenses), 'Expenses');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `tailorflow-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
});

export default router;
