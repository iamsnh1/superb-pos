-- TailorFlow SQLite Schema
-- Complete database schema for Tailoring Management System

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- CORE TABLES
-- ============================================

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','manager','pos_operator','tailor','inventory_manager','delivery_person')) NOT NULL DEFAULT 'pos_operator',
  branch_id INTEGER REFERENCES branches(id),
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- System Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CUSTOMER TABLES
-- ============================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  birthday TEXT,
  anniversary TEXT,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  customer_group TEXT DEFAULT 'Regular' CHECK(customer_group IN ('VIP', 'Regular', 'Walk-in', 'Corporate')),
  tags TEXT, -- JSON array
  loyalty_points INTEGER DEFAULT 0,
  credit_limit REAL DEFAULT 0,
  referrer_id INTEGER REFERENCES customers(id),
  photo_url TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  branch_id INTEGER REFERENCES branches(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Measurement Profiles
CREATE TABLE IF NOT EXISTS measurement_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  garment_type TEXT NOT NULL,
  label TEXT DEFAULT 'Default',
  measurements TEXT NOT NULL, -- JSON object
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVENTORY TABLES
-- ============================================

-- Inventory Categories
CREATE TABLE IF NOT EXISTS inventory_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES inventory_categories(id),
  branch_id INTEGER REFERENCES branches(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES inventory_categories(id),
  unit TEXT DEFAULT 'pieces',
  attributes TEXT, -- JSON: color, size, material, brand
  branch_id INTEGER REFERENCES branches(id),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Stock Levels (per branch)
CREATE TABLE IF NOT EXISTS stock_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  quantity REAL DEFAULT 0,
  reorder_level REAL DEFAULT 0,
  UNIQUE(item_id, branch_id)
);

-- Stock Transactions
CREATE TABLE IF NOT EXISTS stock_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  transaction_type TEXT CHECK(transaction_type IN ('purchase','consumption','adjustment','transfer_in','transfer_out')) NOT NULL,
  quantity REAL NOT NULL,
  reference_type TEXT, -- order, purchase_order, etc.
  reference_id INTEGER,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ORDER TABLES
-- ============================================

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  garment_type TEXT NOT NULL,
  qty REAL DEFAULT 1,
  measurement_profile_id INTEGER REFERENCES measurement_profiles(id),
  fabric_source TEXT DEFAULT 'inventory',
  fabric_item_id INTEGER REFERENCES inventory_items(id),
  design_specifications TEXT, -- JSON
  assigned_tailor_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','measurement_confirmed','in_production','first_fitting','alterations','ready','delivered','cancelled')),
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('normal','urgent')),
  delivery_date TEXT,
  delivery_type TEXT DEFAULT 'pickup' CHECK(delivery_type IN ('pickup','home_delivery')),
  total_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  cgst_rate REAL DEFAULT 0,
  cgst_amount REAL DEFAULT 0,
  sgst_rate REAL DEFAULT 0,
  sgst_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  net_amount REAL DEFAULT 0,
  advance_amount REAL DEFAULT 0,
  balance_amount REAL DEFAULT 0,
  notes TEXT,
  cancellation_reason TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Order Timeline
CREATE TABLE IF NOT EXISTS order_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- BOM Templates
CREATE TABLE IF NOT EXISTS bom_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  garment_type TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- BOM Template Items
CREATE TABLE IF NOT EXISTS bom_template_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES inventory_items(id),
  item_name TEXT NOT NULL,
  default_quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT
);

-- Order BOM Items
CREATE TABLE IF NOT EXISTS order_bom_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES inventory_items(id),
  item_name TEXT NOT NULL,
  required_quantity REAL DEFAULT 0,
  allocated_quantity REAL DEFAULT 0,
  consumed_quantity REAL DEFAULT 0,
  unit TEXT,
  branch_id INTEGER REFERENCES branches(id)
);

-- ============================================
-- SUPPLIER & PURCHASE TABLES
-- ============================================

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','ordered','partial','received','cancelled')),
  total_amount REAL DEFAULT 0,
  notes TEXT,
  expected_date TEXT,
  received_date TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity REAL NOT NULL,
  received_quantity REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  total_price REAL DEFAULT 0
);

-- ============================================
-- MANUFACTURING TABLES
-- ============================================

-- Manufacturing Orders
CREATE TABLE IF NOT EXISTS manufacturing_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mo_number TEXT UNIQUE NOT NULL,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  assigned_tailor_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','cutting','stitching','finishing','qc','completed','rework')),
  priority TEXT DEFAULT 'normal',
  start_date TEXT,
  completion_date TEXT,
  estimated_hours REAL,
  actual_hours REAL,
  work_instructions TEXT,
  qc_notes TEXT,
  qc_passed INTEGER,
  labor_cost REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid', 'included_in_salary')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BILLING & PAYMENT TABLES
-- ============================================

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  amount REAL NOT NULL,
  method TEXT DEFAULT 'cash' CHECK(method IN ('cash','card','upi','bank_transfer','other')),
  reference TEXT,
  notes TEXT,
  collected_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Employee Payments
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
);
CREATE INDEX IF NOT EXISTS idx_employee_payments_employee ON employee_payments(employee_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  cgst_rate REAL DEFAULT 0,
  cgst_amount REAL DEFAULT 0,
  sgst_rate REAL DEFAULT 0,
  sgst_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DELIVERY TABLES
-- ============================================

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','in_transit','delivered','failed','rescheduled')),
  delivery_person_id INTEGER REFERENCES users(id),
  scheduled_date TEXT,
  scheduled_time TEXT,
  delivered_at TEXT,
  proof_photo TEXT,
  signature TEXT,
  failure_reason TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATION TABLES
-- ============================================

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  channel TEXT DEFAULT 'email' CHECK(channel IN ('email','sms','whatsapp')),
  subject TEXT,
  body TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

-- Notification Log
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER REFERENCES notification_templates(id),
  customer_id INTEGER REFERENCES customers(id),
  order_id INTEGER REFERENCES orders(id),
  channel TEXT,
  recipient TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
  sent_at TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FITTING APPOINTMENTS
-- ============================================

-- Fitting Appointments (linked to orders for trial scheduling)
CREATE TABLE IF NOT EXISTS fitting_appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  type TEXT DEFAULT 'first_fitting' CHECK(type IN ('first_fitting','alteration','final_fitting','measurement')),
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EXPENSE TRACKING
-- ============================================

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES expense_categories(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  description TEXT,
  payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash','card','upi','bank_transfer','other')),
  reference TEXT,
  receipt_url TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FABRIC / MATERIAL CATALOGUE
-- ============================================

-- Fabric Catalogue (named fabrics with price per meter)
CREATE TABLE IF NOT EXISTS fabric_catalogue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  fabric_type TEXT,
  color TEXT,
  material TEXT,
  price_per_meter REAL DEFAULT 0,
  available_meters REAL DEFAULT 0,
  supplier_id INTEGER REFERENCES suppliers(id),
  branch_id INTEGER REFERENCES branches(id),
  image_url TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(item_code);
CREATE INDEX IF NOT EXISTS idx_stock_levels_item ON stock_levels(item_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON fitting_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_order ON fitting_appointments(order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON fitting_appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_fabric_catalogue_code ON fabric_catalogue(code);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default branch
INSERT OR IGNORE INTO branches (id, name, address, phone) VALUES (1, 'Main Branch', 'Default Address', '1234567890');

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('business_name', 'TailorFlow Pro'),
  ('currency', 'INR'),
  ('timezone', 'Asia/Kolkata'),
  ('order_prefix', 'ORD'),
  ('customer_prefix', 'CUST'),
  ('default_delivery_days', '7'),
  ('advance_percentage', '50'),
  ('tax_rate', '18');

-- Default expense categories
INSERT OR IGNORE INTO expense_categories (id, name, description) VALUES 
  (1, 'Shop Rent', 'Monthly rent for the shop/workspace'),
  (2, 'Electricity', 'Electricity and utility bills'),
  (3, 'Water', 'Water supply bills'),
  (4, 'Internet & Phone', 'Internet and telephone bills'),
  (5, 'Equipment Maintenance', 'Sewing machine servicing, iron repairs, etc.'),
  (6, 'Transport', 'Delivery and pickup transportation costs'),
  (7, 'Packaging', 'Garment bags, boxes, hangers'),
  (8, 'Marketing', 'Ads, visiting cards, banners'),
  (9, 'Miscellaneous', 'Other uncategorized expenses');
