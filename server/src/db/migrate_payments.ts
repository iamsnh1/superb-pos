
import { db } from './index.js';

console.log('Migrating database for Employee Payments...');

try {
    // 1. Create employee_payments table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS employee_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL REFERENCES users(id),
            amount REAL NOT NULL,
            payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
            payment_type TEXT DEFAULT 'salary' CHECK(payment_type IN ('salary', 'commission', 'advance', 'adjustment')),
            reference_mo_id INTEGER REFERENCES manufacturing_orders(id),
            notes TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // 2. Add indexes
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_employee_payments_employee ON employee_payments(employee_id)`).run();

    // 3. Add columns to manufacturing_orders
    // Check if columns exist first to avoid errors
    const tableInfo = db.prepare(`PRAGMA table_info(manufacturing_orders)`).all() as any[];
    const hasLaborCost = tableInfo.some(col => col.name === 'labor_cost');
    const hasPaymentStatus = tableInfo.some(col => col.name === 'payment_status');

    if (!hasLaborCost) {
        db.prepare(`ALTER TABLE manufacturing_orders ADD COLUMN labor_cost REAL DEFAULT 0`).run();
        console.log('Added labor_cost to manufacturing_orders');
    }

    if (!hasPaymentStatus) {
        db.prepare(`ALTER TABLE manufacturing_orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid', 'included_in_salary'))`).run();
        console.log('Added payment_status to manufacturing_orders');
    }

    console.log('Migration completed successfully.');

} catch (error) {
    console.error('Migration failed:', error);
}
