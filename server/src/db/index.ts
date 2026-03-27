import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', '..', 'data', 'tailorflow.db');
const SCHEMA_PATH = process.env.SCHEMA_PATH || path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
export const db: Database.Database = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
export function initializeDatabase() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  // Measurement requests table (added post-init)
  db.exec(`
      CREATE TABLE IF NOT EXISTS measurement_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        garment_type TEXT NOT NULL,
        requested_changes TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        created_by INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // Activity Log table (fixes 500 error on login)
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS garment_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        measurement_fields TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // Add reserved_quantity to stock_levels if not exists (migration)
  try {
    db.prepare('SELECT reserved_quantity FROM stock_levels LIMIT 1').get();
  } catch (e) {
    console.log('Migrating stock_levels table...');
    db.exec('ALTER TABLE stock_levels ADD COLUMN reserved_quantity REAL DEFAULT 0');
  }

  // Add base_price to garment_templates if not exists (migration)
  try {
    db.prepare('SELECT base_price FROM garment_templates LIMIT 1').get();
  } catch (e) {
    console.log('Migrating garment_templates table (base_price)...');
    db.exec('ALTER TABLE garment_templates ADD COLUMN base_price REAL DEFAULT 0');
  }

  // Add styles to garment_templates if not exists (migration)
  try {
    db.prepare('SELECT styles FROM garment_templates LIMIT 1').get();
  } catch (e) {
    console.log('Migrating garment_templates table (styles)...');
    db.exec("ALTER TABLE garment_templates ADD COLUMN styles TEXT DEFAULT '[]'");
  }
  // Add new customer columns if not exists (migration)
  try {
    db.prepare('SELECT customer_group FROM customers LIMIT 1').get();
  } catch (e) {
    console.log('Migrating customers table (group, tags, points, etc)...');
    const cols = [
      "city TEXT", "state TEXT", "zip_code TEXT", "anniversary TEXT",
      "gender TEXT", "customer_group TEXT DEFAULT 'Regular'",
      "tags TEXT", "loyalty_points INTEGER DEFAULT 0", "credit_limit REAL DEFAULT 0",
      "referrer_id INTEGER REFERENCES customers(id)", "photo_url TEXT",
      "is_active INTEGER DEFAULT 1"
    ];
    cols.forEach(col => {
      try {
        db.exec(`ALTER TABLE customers ADD COLUMN ${col}`);
      } catch (err: any) {
        // Check if error is because column already exists (can happen if partial migration)
        if (err.message && !err.message.includes("duplicate column name")) {
          console.error(`Failed to add column ${col}:`, err.message);
        }
      }
    });
    // handle updated_at separately if needed, or skip for now to avoid crash
  }

  // Migration for POS support (group_id, invoice_id, measurements)
  try {
    db.prepare('SELECT group_id FROM orders LIMIT 1').get();
  } catch (e) {
    console.log('Migrating for POS support (grouping & invoicing)...');
    try { db.exec('ALTER TABLE orders ADD COLUMN group_id TEXT'); } catch (err) { }
    try { db.exec('ALTER TABLE orders ADD COLUMN invoice_id INTEGER REFERENCES invoices(id)'); } catch (err) { }
    try { db.exec('ALTER TABLE payments ADD COLUMN invoice_id INTEGER REFERENCES invoices(id)'); } catch (err) { }
  }

  // CGST/SGST Support migration
  try {
    db.prepare('SELECT cgst_rate FROM orders LIMIT 1').get();
  } catch (e) {
    console.log('Migrating for CGST/SGST support...');
    const orderCols = [
      "cgst_rate REAL DEFAULT 0", "cgst_amount REAL DEFAULT 0",
      "sgst_rate REAL DEFAULT 0", "sgst_amount REAL DEFAULT 0"
    ];
    orderCols.forEach(col => {
      try { db.exec(`ALTER TABLE orders ADD COLUMN ${col}`); } catch (err) { }
    });

    const invoiceCols = [
      "tax_amount REAL DEFAULT 0", "cgst_rate REAL DEFAULT 0", "cgst_amount REAL DEFAULT 0",
      "sgst_rate REAL DEFAULT 0", "sgst_amount REAL DEFAULT 0"
    ];
    invoiceCols.forEach(col => {
      try { db.exec(`ALTER TABLE invoices ADD COLUMN ${col}`); } catch (err) { }
    });
  }

  // Add updated_at to manufacturing_orders if not exists
  try {
    db.prepare('SELECT updated_at FROM manufacturing_orders LIMIT 1').get();
  } catch (e) {
    console.log('Migrating manufacturing_orders table (updated_at)...');
    try { db.exec('ALTER TABLE manufacturing_orders ADD COLUMN updated_at TEXT DEFAULT "2024-01-01 00:00:00"'); } catch (err) { }
  }

  try {
    db.prepare('SELECT measurements FROM orders LIMIT 1').get();
  } catch (e) {
    console.log('Migrating orders table (measurements)...');
    try { db.exec('ALTER TABLE orders ADD COLUMN measurements TEXT'); } catch (err) { }
  }

  try {
    db.prepare('SELECT qty FROM orders LIMIT 1').get();
  } catch (e) {
    console.log('Migrating orders table (qty)...');
    try { db.exec('ALTER TABLE orders ADD COLUMN qty REAL DEFAULT 1'); } catch (err) { }
  }

  // Delivery & Trial Management migrations
  try {
    db.prepare('SELECT trial_date FROM orders LIMIT 1').get();
  } catch (e) {
    console.log('Migrating orders table for Phase 8 (Delivery & Trials)...');
    const cols = [
      "trial_date TEXT",
      "trial_status TEXT DEFAULT 'pending'",
      "fitting_notes TEXT",
      "delivery_person_id INTEGER REFERENCES users(id)",
      "delivery_status TEXT DEFAULT 'scheduled'",
      "delivery_proof_url TEXT"
    ];
    cols.forEach(col => {
      try {
        db.exec(`ALTER TABLE orders ADD COLUMN ${col}`);
      } catch (err) { }
    });
  }

  // Employee Management migrations
  try {
    db.prepare('SELECT specialization FROM users LIMIT 1').get();
  } catch (e) {
    console.log('Migrating users table for Employee Management...');
    const userCols = [
      "specialization TEXT", // e.g., "Suits,Shirts"
      "salary_type TEXT DEFAULT 'monthly'", // 'monthly' or 'piece_rate'
      "is_available INTEGER DEFAULT 1"
    ];
    userCols.forEach(col => {
      try {
        db.exec(`ALTER TABLE users ADD COLUMN ${col}`);
      } catch (err) { }
    });
  }

  try {
    db.prepare('SELECT base_salary FROM users LIMIT 1').get();
  } catch (e) {
    console.log('Migrating users table (base_salary)...');
    try { db.exec('ALTER TABLE users ADD COLUMN base_salary REAL DEFAULT 0'); } catch (err) { }
  }

  try {
    db.prepare('SELECT base_price FROM garment_templates LIMIT 1').get();
  } catch (e) {
    console.log('Migrating garment_templates (base_price, styles)...');
    try { db.exec('ALTER TABLE garment_templates ADD COLUMN base_price REAL DEFAULT 0'); } catch (err) { }
    try { db.exec('ALTER TABLE garment_templates ADD COLUMN styles TEXT DEFAULT "[]"'); } catch (err) { }
  }

  db.exec(`
      CREATE TABLE IF NOT EXISTS garment_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        measurement_fields TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

  const templateCount = (db.prepare('SELECT COUNT(*) as c FROM garment_templates').get() as any).c;
  if (templateCount === 0) {
    console.log('Seeding garment templates...');
    const seeds = [
      {
        code: 'shirt', name: 'Shirt', fields: [
          { key: "chest", label: "Chest", unit: "in" }, { key: "waist", label: "Waist", unit: "in" }, { key: "shoulder", label: "Shoulder", unit: "in" },
          { key: "sleeve_length", label: "Sleeve Length", unit: "in" }, { key: "shirt_length", label: "Shirt Length", unit: "in" }, { key: "neck", label: "Neck", unit: "in" },
          { key: "cuff", label: "Cuff", unit: "in" }, { key: "bicep", label: "Bicep", unit: "in" }
        ]
      },
      {
        code: 'pant', name: 'Pant', fields: [
          { key: "waist", label: "Waist", unit: "in" }, { key: "hip", label: "Hip", unit: "in" }, { key: "inseam", label: "Inseam", unit: "in" },
          { key: "outseam", label: "Outseam", unit: "in" }, { key: "thigh", label: "Thigh", unit: "in" }, { key: "knee", label: "Knee", unit: "in" },
          { key: "bottom_width", label: "Bottom Width", unit: "in" }, { key: "rise", label: "Rise", unit: "in" }
        ]
      },
      {
        code: 'kurta', name: 'Kurta', fields: [
          { key: "chest", label: "Chest", unit: "in" }, { key: "waist", label: "Waist", unit: "in" }, { key: "shoulder", label: "Shoulder", unit: "in" },
          { key: "sleeve_length", label: "Sleeve Length", unit: "in" }, { key: "kurta_length", label: "Kurta Length", unit: "in" }, { key: "neck", label: "Neck", unit: "in" },
          { key: "armhole", label: "Armhole", unit: "in" }
        ]
      },
      {
        code: 'suit', name: 'Suit', fields: [
          { key: "chest", label: "Chest", unit: "in" }, { key: "waist", label: "Waist", unit: "in" }, { key: "shoulder", label: "Shoulder", unit: "in" },
          { key: "sleeve_length", label: "Sleeve Length", unit: "in" }, { key: "jacket_length", label: "Jacket Length", unit: "in" }, { key: "neck", label: "Neck", unit: "in" },
          { key: "hip", label: "Hip", unit: "in" }, { key: "inseam", label: "Inseam", unit: "in" }, { key: "outseam", label: "Outseam", unit: "in" }, { key: "thigh", label: "Thigh", unit: "in" }
        ]
      },
      {
        code: 'blouse', name: 'Blouse', fields: [
          { key: "bust", label: "Bust", unit: "in" }, { key: "waist", label: "Waist", unit: "in" }, { key: "shoulder", label: "Shoulder", unit: "in" },
          { key: "sleeve_length", label: "Sleeve Length", unit: "in" }, { key: "blouse_length", label: "Blouse Length", unit: "in" }, { key: "neck_front", label: "Neck Front", unit: "in" },
          { key: "neck_back", label: "Neck Back", unit: "in" }, { key: "armhole", label: "Armhole", unit: "in" }
        ]
      },
      {
        code: 'other', name: 'Other', fields: [
          { key: "chest", label: "Chest", unit: "in" }, { key: "waist", label: "Waist", unit: "in" }, { key: "hip", label: "Hip", unit: "in" },
          { key: "length", label: "Length", unit: "in" }, { key: "shoulder", label: "Shoulder", unit: "in" }
        ]
      }
    ];

    const insert = db.prepare('INSERT INTO garment_templates (code, name, measurement_fields, base_price) VALUES (?, ?, ?, ?)');
    seeds.forEach(s => insert.run(s.code, s.name, JSON.stringify(s.fields), 0));
  }

  console.log('✅ Database schema initialized');

  // Create default admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@tailorflow.com');
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role, branch_id) 
      VALUES (?, ?, ?, ?, ?)
    `).run('admin@tailorflow.com', passwordHash, 'Administrator', 'admin', 1);
    console.log('✅ Default admin user created: admin@tailorflow.com / admin123');
  }

  // Create sample tailor if not exists
  const tailorExists = db.prepare('SELECT id FROM users WHERE role = ?').get('tailor');
  if (!tailorExists) {
    const passwordHash = bcrypt.hashSync('tailor123', 10);
    db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role, branch_id) 
      VALUES (?, ?, ?, ?, ?)
    `).run('tailor@tailorflow.com', passwordHash, 'Sample Tailor', 'tailor', 1);
    console.log('✅ Sample tailor created: tailor@tailorflow.com / tailor123');
  }
}

// Helper to get setting value
export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

// Helper to set setting value
export function setSetting(key: string, value: string) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, value);
}

// Generate next number with prefix
export function generateNextNumber(prefix: string, table: string, column: string, includeYear: boolean = true): string {
  // 4-digit only mode
  if (prefix === 'none') {
    const rows = db.prepare(`SELECT ${column} FROM ${table}`).all() as { [key: string]: string }[];
    let maxNum = 0;
    rows.forEach(row => {
      const val = row[column];
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return String(maxNum + 1).padStart(4, '0');
  }

  const year = new Date().getFullYear();
  const pattern = includeYear ? `${prefix}-${year}-%` : `${prefix}-%`;

  const rows = db.prepare(`
    SELECT ${column} FROM ${table} WHERE ${column} LIKE ?
  `).all(pattern) as { [key: string]: string }[];

  let maxNum = 0;

  rows.forEach(row => {
    const val = row[column];
    const parts = val.split('-');
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  const numStr = String(nextNum).padStart(4, '0');

  return includeYear ? `${prefix}-${year}-${numStr}` : `${prefix}-${numStr}`;
}

// No direct execution in ESM, use exported initializeDatabase
