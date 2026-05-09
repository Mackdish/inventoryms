-- Generic helper: assert that a referenced row's tenant matches NEW.tenant_id
CREATE OR REPLACE FUNCTION public.assert_same_tenant(
  _ref_table regclass,
  _ref_id uuid,
  _expected_tenant uuid,
  _label text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_tenant uuid;
BEGIN
  IF _ref_id IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format('SELECT tenant_id FROM %s WHERE id = $1', _ref_table)
    INTO v_ref_tenant USING _ref_id;
  IF v_ref_tenant IS NULL THEN
    RAISE EXCEPTION 'Referenced % does not exist', _label
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF v_ref_tenant <> _expected_tenant THEN
    RAISE EXCEPTION 'Referenced % belongs to a different workspace', _label
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

-- sales_order_items: parent + product
CREATE OR REPLACE FUNCTION public.tg_sales_order_items_tenant_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.assert_same_tenant('public.sales_orders'::regclass, NEW.sales_order_id, NEW.tenant_id, 'sales order');
  PERFORM public.assert_same_tenant('public.products'::regclass,    NEW.product_id,     NEW.tenant_id, 'product');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sales_order_items_tenant_guard ON public.sales_order_items;
CREATE TRIGGER sales_order_items_tenant_guard
BEFORE INSERT OR UPDATE ON public.sales_order_items
FOR EACH ROW EXECUTE FUNCTION public.tg_sales_order_items_tenant_guard();

-- purchase_order_items: parent + product
CREATE OR REPLACE FUNCTION public.tg_purchase_order_items_tenant_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.assert_same_tenant('public.purchase_orders'::regclass, NEW.purchase_order_id, NEW.tenant_id, 'purchase order');
  PERFORM public.assert_same_tenant('public.products'::regclass,        NEW.product_id,        NEW.tenant_id, 'product');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS purchase_order_items_tenant_guard ON public.purchase_order_items;
CREATE TRIGGER purchase_order_items_tenant_guard
BEFORE INSERT OR UPDATE ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION public.tg_purchase_order_items_tenant_guard();

-- sales_orders: customer
CREATE OR REPLACE FUNCTION public.tg_sales_orders_tenant_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.assert_same_tenant('public.customers'::regclass, NEW.customer_id, NEW.tenant_id, 'customer');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sales_orders_tenant_guard ON public.sales_orders;
CREATE TRIGGER sales_orders_tenant_guard
BEFORE INSERT OR UPDATE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_sales_orders_tenant_guard();

-- purchase_orders: vendor
CREATE OR REPLACE FUNCTION public.tg_purchase_orders_tenant_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.assert_same_tenant('public.vendors'::regclass, NEW.vendor_id, NEW.tenant_id, 'vendor');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS purchase_orders_tenant_guard ON public.purchase_orders;
CREATE TRIGGER purchase_orders_tenant_guard
BEFORE INSERT OR UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_purchase_orders_tenant_guard();

-- deliveries: customer
CREATE OR REPLACE FUNCTION public.tg_deliveries_tenant_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.assert_same_tenant('public.customers'::regclass, NEW.customer_id, NEW.tenant_id, 'customer');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS deliveries_tenant_guard ON public.deliveries;
CREATE TRIGGER deliveries_tenant_guard
BEFORE INSERT OR UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.tg_deliveries_tenant_guard();

-- products: category + vendor
CREATE OR REPLACE FUNCTION public.tg_products_tenant_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.assert_same_tenant('public.categories'::regclass, NEW.category_id, NEW.tenant_id, 'category');
  PERFORM public.assert_same_tenant('public.vendors'::regclass,    NEW.vendor_id,   NEW.tenant_id, 'vendor');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS products_tenant_guard ON public.products;
CREATE TRIGGER products_tenant_guard
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.tg_products_tenant_guard();

-- invoices: product
CREATE OR REPLACE FUNCTION public.tg_invoices_tenant_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.assert_same_tenant('public.products'::regclass, NEW.product_id, NEW.tenant_id, 'product');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invoices_tenant_guard ON public.invoices;
CREATE TRIGGER invoices_tenant_guard
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.tg_invoices_tenant_guard();

-- payments: invoice
CREATE OR REPLACE FUNCTION public.tg_payments_tenant_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.assert_same_tenant('public.invoices'::regclass, NEW.invoice_id, NEW.tenant_id, 'invoice');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS payments_tenant_guard ON public.payments;
CREATE TRIGGER payments_tenant_guard
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_payments_tenant_guard();