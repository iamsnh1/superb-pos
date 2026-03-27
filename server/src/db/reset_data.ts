
import { db } from './index.js';

console.log('Resetting Database to "Start Fresh" state...');
console.log('WARNING: This will delete ALL customers, orders, inventory, and transactions.');
console.log('Preserving: Users (Admin/Staff), Settings, Branches, and Templates.');

// List of tables to truncate (delete all rows)
const transactionTables = [
    'employee_payments',
    'payments',
    'invoices',
    'stock_transactions',
    'stock_levels',
    'order_bom_items',
    'bom_template_items',
    'bom_templates', // Maybe keep? User said "remove all dummy data", usually templates are data. But let's keep boilerplate if it was seeded. Actually schema seeds if simple.
    'manufacturing_orders',
    'deliveries',
    'order_timeline',
    'orders',
    'measurement_profiles',
    'measurement_requests',
    'customers',
    'purchase_order_items',
    'purchase_orders',
    'inventory_items',
    'suppliers'
];

// Tables to keep:
// - users (we want to keep the login)
// - settings (branding)
// - branches (structure)
// - garment_templates (these are system definitions usually)
// - inventory_categories (structure)

const keepCategories = true;

try {
    // Disable foreign keys globally before starting the deletion
    db.pragma('foreign_keys = OFF');

    try {
        db.transaction(() => {
            for (const table of transactionTables) {
                console.log(`Clearing table: ${table}...`);
                const stmt = db.prepare(`DELETE FROM ${table}`);
                stmt.run();
                // Reset auto-increment counters
                try {
                    db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
                } catch (e) { }
            }

            if (!keepCategories) {
                console.log(`Clearing table: inventory_categories...`);
                db.prepare(`DELETE FROM inventory_categories`).run();
                try {
                    db.prepare(`DELETE FROM sqlite_sequence WHERE name = 'inventory_categories'`).run();
                } catch (e) { }
            }
        })();
    } finally {
        db.pragma('foreign_keys = ON');
    }

    console.log('✅ Database reset complete.');
    console.log('System is now fresh and ready for new data.');

} catch (error) {
    console.error('❌ Failed to reset database:', error);
}
