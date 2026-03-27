
-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.garment_type AS ENUM (
  'shirt', 'pant', 'kurta', 'suit', 'blouse', 'sherwani',
  'lehenga', 'saree_blouse', 'waistcoat', 'other'
);

CREATE TYPE public.order_status AS ENUM (
  'pending', 'measurement_confirmed', 'in_production',
  'first_fitting', 'alterations', 'ready', 'delivered', 'cancelled'
);

CREATE TYPE public.po_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');

CREATE TYPE public.mo_status AS ENUM (
  'pending', 'cutting', 'stitching', 'finishing', 'qc', 'completed'
);

CREATE TYPE public.delivery_status AS ENUM ('scheduled', 'in_transit', 'delivered', 'failed');
CREATE TYPE public.delivery_type AS ENUM ('pickup', 'home_delivery');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'upi', 'bank_transfer');
CREATE TYPE public.stock_txn_type AS ENUM (
  'purchase', 'consumption', 'adjustment', 'transfer', 'allocation', 'deallocation'
);
CREATE TYPE public.measurement_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.notification_channel AS ENUM ('sms', 'email', 'whatsapp');
CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE public.qc_result AS ENUM ('pending', 'passed', 'failed', 'rework');
CREATE TYPE public.inventory_unit AS ENUM ('meters', 'pieces', 'spools', 'yards', 'kg', 'grams', 'rolls');

-- =====================================================
-- SEQUENCES
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS public.customer_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.po_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.mo_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.transfer_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.item_code_seq START 1;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.user_has_branch_access(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR public.get_user_branch_id(_user_id) = _branch_id
$$;

-- =====================================================
-- TABLES
-- =====================================================

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  birthday DATE,
  notes TEXT,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Measurement profiles
CREATE TABLE public.measurement_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  garment_type public.garment_type NOT NULL,
  label TEXT DEFAULT 'Default',
  measurements JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  measured_by UUID,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Measurement modification requests
CREATE TABLE public.measurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_profile_id UUID NOT NULL REFERENCES public.measurement_profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  requested_by UUID NOT NULL,
  previous_measurements JSONB NOT NULL DEFAULT '{}',
  new_measurements JSONB NOT NULL DEFAULT '{}',
  reason TEXT,
  status public.measurement_request_status NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory categories
CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.inventory_categories(id),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.inventory_categories(id),
  description TEXT,
  unit public.inventory_unit NOT NULL DEFAULT 'pieces',
  attributes JSONB NOT NULL DEFAULT '{}',
  reorder_level NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2) DEFAULT 0,
  selling_price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock levels per branch
CREATE TABLE public.stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  allocated_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, branch_id)
);

-- Stock transactions
CREATE TABLE public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  transaction_type public.stock_txn_type NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  gst_number TEXT,
  items_supplied TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase orders
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  status public.po_status NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase order items
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  garment_type public.garment_type NOT NULL,
  measurement_profile_id UUID REFERENCES public.measurement_profiles(id),
  fabric_source TEXT NOT NULL DEFAULT 'inventory',
  fabric_item_id UUID REFERENCES public.inventory_items(id),
  design_specifications JSONB NOT NULL DEFAULT '{}',
  status public.order_status NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_tailor_id UUID,
  delivery_date DATE,
  delivery_type public.delivery_type NOT NULL DEFAULT 'pickup',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cancellation_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order timeline
CREATE TABLE public.order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BOM templates
CREATE TABLE public.bom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garment_type public.garment_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BOM template items
CREATE TABLE public.bom_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.bom_templates(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id),
  category_id UUID REFERENCES public.inventory_categories(id),
  item_name TEXT NOT NULL,
  default_quantity NUMERIC(10,2) NOT NULL,
  unit public.inventory_unit NOT NULL DEFAULT 'pieces',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order BOM items
CREATE TABLE public.order_bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id),
  item_name TEXT NOT NULL,
  required_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  allocated_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  consumed_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit public.inventory_unit NOT NULL DEFAULT 'pieces',
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Manufacturing orders
CREATE TABLE public.manufacturing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mo_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  assigned_tailor_id UUID,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  status public.mo_status NOT NULL DEFAULT 'pending',
  work_instructions TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_hours NUMERIC(6,2),
  actual_hours NUMERIC(6,2),
  qc_status public.qc_result NOT NULL DEFAULT 'pending',
  qc_notes TEXT,
  qc_checked_by UUID,
  qc_checked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MO status history
CREATE TABLE public.mo_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturing_order_id UUID NOT NULL REFERENCES public.manufacturing_orders(id) ON DELETE CASCADE,
  status public.mo_status NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  amount NUMERIC(12,2) NOT NULL,
  payment_method public.payment_method NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'advance',
  reference_number TEXT,
  notes TEXT,
  received_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deliveries
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  delivery_type public.delivery_type NOT NULL DEFAULT 'pickup',
  status public.delivery_status NOT NULL DEFAULT 'scheduled',
  delivery_person_id UUID,
  scheduled_date DATE,
  scheduled_time TEXT,
  delivery_address TEXT,
  delivered_at TIMESTAMPTZ,
  proof_photo_url TEXT,
  signature_url TEXT,
  failure_reason TEXT,
  rescheduled_from UUID REFERENCES public.deliveries(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification templates
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  channel public.notification_channel NOT NULL,
  subject TEXT,
  body_template TEXT NOT NULL,
  placeholders JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification log
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.notification_templates(id),
  customer_id UUID REFERENCES public.customers(id),
  channel public.notification_channel NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status public.notification_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock transfers
CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT NOT NULL UNIQUE,
  from_branch_id UUID NOT NULL REFERENCES public.branches(id),
  to_branch_id UUID NOT NULL REFERENCES public.branches(id),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock transfer items
CREATE TABLE public.stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity NUMERIC(10,2) NOT NULL,
  received_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- AUTO-CODE GENERATION FUNCTIONS & TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := 'CUST-' || LPAD(nextval('public.customer_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_customer_code BEFORE INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.generate_customer_code();

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'ORD-' || LPAD(nextval('public.order_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_order_number BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || LPAD(nextval('public.po_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_po_number BEFORE INSERT ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.generate_po_number();

CREATE OR REPLACE FUNCTION public.generate_mo_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mo_number IS NULL OR NEW.mo_number = '' THEN
    NEW.mo_number := 'MO-' || LPAD(nextval('public.mo_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_mo_number BEFORE INSERT ON public.manufacturing_orders
FOR EACH ROW EXECUTE FUNCTION public.generate_mo_number();

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || LPAD(nextval('public.invoice_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_invoice_number BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();

CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_code IS NULL OR NEW.item_code = '' THEN
    NEW.item_code := 'ITM-' || LPAD(nextval('public.item_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_item_code BEFORE INSERT ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.generate_item_code();

CREATE OR REPLACE FUNCTION public.generate_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
    NEW.transfer_number := 'TRF-' || LPAD(nextval('public.transfer_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_transfer_number BEFORE INSERT ON public.stock_transfers
FOR EACH ROW EXECUTE FUNCTION public.generate_transfer_number();

-- =====================================================
-- UPDATE TIMESTAMP TRIGGERS
-- =====================================================
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_measurement_profiles_updated_at BEFORE UPDATE ON public.measurement_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_measurement_requests_updated_at BEFORE UPDATE ON public.measurement_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_categories_updated_at BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON public.stock_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bom_templates_updated_at BEFORE UPDATE ON public.bom_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_order_bom_items_updated_at BEFORE UPDATE ON public.order_bom_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_manufacturing_orders_updated_at BEFORE UPDATE ON public.manufacturing_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ORDER TIMELINE AUTO-INSERT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_timeline (order_id, status, created_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_order_timeline
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- MO status history auto-insert
CREATE OR REPLACE FUNCTION public.log_mo_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.mo_status_history (manufacturing_order_id, status, created_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_mo_status_history
AFTER INSERT OR UPDATE OF status ON public.manufacturing_orders
FOR EACH ROW EXECUTE FUNCTION public.log_mo_status_change();

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mo_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- CUSTOMERS
CREATE POLICY "Admins can manage all customers" ON public.customers FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view branch customers" ON public.customers FOR SELECT USING (public.user_has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Users can insert customers" ON public.customers FOR INSERT WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','pos_operator']::app_role[])
);
CREATE POLICY "Managers can update customers" ON public.customers FOR UPDATE USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','pos_operator']::app_role[])
);

-- MEASUREMENT PROFILES
CREATE POLICY "Admins can manage all measurements" ON public.measurement_profiles FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view measurements" ON public.measurement_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND public.user_has_branch_access(auth.uid(), c.branch_id))
);
CREATE POLICY "Users can insert measurements" ON public.measurement_profiles FOR INSERT WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','pos_operator','tailor']::app_role[])
);
CREATE POLICY "Users can update measurements" ON public.measurement_profiles FOR UPDATE USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','pos_operator','tailor']::app_role[])
);

-- MEASUREMENT REQUESTS
CREATE POLICY "Admins can manage all measurement requests" ON public.measurement_requests FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view measurement requests" ON public.measurement_requests FOR SELECT USING (
  requested_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
);
CREATE POLICY "Users can create measurement requests" ON public.measurement_requests FOR INSERT WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Managers can update measurement requests" ON public.measurement_requests FOR UPDATE USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
);

-- INVENTORY CATEGORIES
CREATE POLICY "Authenticated users can view categories" ON public.inventory_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers can manage categories" ON public.inventory_categories FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- INVENTORY ITEMS
CREATE POLICY "Authenticated users can view items" ON public.inventory_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Inventory managers can manage items" ON public.inventory_items FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- STOCK LEVELS
CREATE POLICY "Users can view stock levels" ON public.stock_levels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Inventory managers can manage stock" ON public.stock_levels FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- STOCK TRANSACTIONS
CREATE POLICY "Users can view stock transactions" ON public.stock_transactions FOR SELECT USING (
  public.user_has_branch_access(auth.uid(), branch_id)
);
CREATE POLICY "Inventory managers can insert transactions" ON public.stock_transactions FOR INSERT WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- SUPPLIERS
CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers can manage suppliers" ON public.suppliers FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- PURCHASE ORDERS
CREATE POLICY "Admins can manage all POs" ON public.purchase_orders FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view branch POs" ON public.purchase_orders FOR SELECT USING (public.user_has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Managers can manage POs" ON public.purchase_orders FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- PURCHASE ORDER ITEMS
CREATE POLICY "Users can view PO items" ON public.purchase_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND public.user_has_branch_access(auth.uid(), po.branch_id))
);
CREATE POLICY "Managers can manage PO items" ON public.purchase_order_items FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- ORDERS
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view branch orders" ON public.orders FOR SELECT USING (public.user_has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Operators can insert orders" ON public.orders FOR INSERT WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','pos_operator']::app_role[])
);
CREATE POLICY "Operators can update orders" ON public.orders FOR UPDATE USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','pos_operator']::app_role[])
);
CREATE POLICY "Tailors can view assigned orders" ON public.orders FOR SELECT USING (assigned_tailor_id = auth.uid());

-- ORDER TIMELINE
CREATE POLICY "Users can view order timeline" ON public.order_timeline FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.user_has_branch_access(auth.uid(), o.branch_id))
);
CREATE POLICY "Users can insert timeline entries" ON public.order_timeline FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- BOM TEMPLATES
CREATE POLICY "Authenticated users can view BOM templates" ON public.bom_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage BOM templates" ON public.bom_templates FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
);

-- BOM TEMPLATE ITEMS
CREATE POLICY "Authenticated users can view BOM template items" ON public.bom_template_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage BOM template items" ON public.bom_template_items FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
);

-- ORDER BOM ITEMS
CREATE POLICY "Users can view order BOM items" ON public.order_bom_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.user_has_branch_access(auth.uid(), o.branch_id))
);
CREATE POLICY "Managers can manage order BOM" ON public.order_bom_items FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- MANUFACTURING ORDERS
CREATE POLICY "Admins can manage all MOs" ON public.manufacturing_orders FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view branch MOs" ON public.manufacturing_orders FOR SELECT USING (public.user_has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Tailors can view assigned MOs" ON public.manufacturing_orders FOR SELECT USING (assigned_tailor_id = auth.uid());
CREATE POLICY "Tailors can update assigned MOs" ON public.manufacturing_orders FOR UPDATE USING (assigned_tailor_id = auth.uid());
CREATE POLICY "Managers can manage MOs" ON public.manufacturing_orders FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
);

-- MO STATUS HISTORY
CREATE POLICY "Users can view MO history" ON public.mo_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.manufacturing_orders mo WHERE mo.id = manufacturing_order_id AND public.user_has_branch_access(auth.uid(), mo.branch_id))
);
CREATE POLICY "Users can insert MO history" ON public.mo_status_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- INVOICES
CREATE POLICY "Admins can manage all invoices" ON public.invoices FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view branch invoices" ON public.invoices FOR SELECT USING (public.user_has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Operators can manage invoices" ON public.invoices FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','pos_operator']::app_role[])
);

-- PAYMENTS
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view branch payments" ON public.payments FOR SELECT USING (public.user_has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Operators can insert payments" ON public.payments FOR INSERT WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','pos_operator']::app_role[])
);

-- DELIVERIES
CREATE POLICY "Admins can manage all deliveries" ON public.deliveries FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view branch deliveries" ON public.deliveries FOR SELECT USING (public.user_has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Delivery persons can view assigned" ON public.deliveries FOR SELECT USING (delivery_person_id = auth.uid());
CREATE POLICY "Delivery persons can update assigned" ON public.deliveries FOR UPDATE USING (delivery_person_id = auth.uid());
CREATE POLICY "Managers can manage deliveries" ON public.deliveries FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
);

-- NOTIFICATION TEMPLATES
CREATE POLICY "Authenticated users can view templates" ON public.notification_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage templates" ON public.notification_templates FOR ALL USING (public.is_admin(auth.uid()));

-- NOTIFICATION LOG
CREATE POLICY "Admins can manage all notifications" ON public.notification_log FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view notifications" ON public.notification_log FOR SELECT USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
);
CREATE POLICY "System can insert notifications" ON public.notification_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- STOCK TRANSFERS
CREATE POLICY "Admins can manage all transfers" ON public.stock_transfers FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view branch transfers" ON public.stock_transfers FOR SELECT USING (
  public.user_has_branch_access(auth.uid(), from_branch_id) OR public.user_has_branch_access(auth.uid(), to_branch_id)
);
CREATE POLICY "Managers can manage transfers" ON public.stock_transfers FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- STOCK TRANSFER ITEMS
CREATE POLICY "Users can view transfer items" ON public.stock_transfer_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stock_transfers st WHERE st.id = transfer_id AND (
    public.user_has_branch_access(auth.uid(), st.from_branch_id) OR public.user_has_branch_access(auth.uid(), st.to_branch_id)
  ))
);
CREATE POLICY "Managers can manage transfer items" ON public.stock_transfer_items FOR ALL USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','inventory_manager']::app_role[])
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_customers_branch ON public.customers(branch_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_code ON public.customers(customer_code);
CREATE INDEX idx_customers_name ON public.customers(full_name);
CREATE INDEX idx_measurement_profiles_customer ON public.measurement_profiles(customer_id);
CREATE INDEX idx_measurement_profiles_garment ON public.measurement_profiles(garment_type);
CREATE INDEX idx_measurement_requests_status ON public.measurement_requests(status);
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category_id);
CREATE INDEX idx_inventory_items_code ON public.inventory_items(item_code);
CREATE INDEX idx_stock_levels_item_branch ON public.stock_levels(item_id, branch_id);
CREATE INDEX idx_stock_transactions_item ON public.stock_transactions(item_id);
CREATE INDEX idx_stock_transactions_branch ON public.stock_transactions(branch_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_branch ON public.orders(branch_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_tailor ON public.orders(assigned_tailor_id);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_order_timeline_order ON public.order_timeline(order_id);
CREATE INDEX idx_order_bom_items_order ON public.order_bom_items(order_id);
CREATE INDEX idx_manufacturing_orders_order ON public.manufacturing_orders(order_id);
CREATE INDEX idx_manufacturing_orders_tailor ON public.manufacturing_orders(assigned_tailor_id);
CREATE INDEX idx_manufacturing_orders_status ON public.manufacturing_orders(status);
CREATE INDEX idx_invoices_order ON public.invoices(order_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_deliveries_order ON public.deliveries(order_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_person ON public.deliveries(delivery_person_id);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_branch ON public.purchase_orders(branch_id);

-- =====================================================
-- ENABLE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manufacturing_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
