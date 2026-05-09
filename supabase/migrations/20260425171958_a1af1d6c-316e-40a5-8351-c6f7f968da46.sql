-- Helper: is current user a super admin?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;

-- Global SELECT policies for super admins
CREATE POLICY "super_admin_select_tenants" ON public.tenants
  FOR SELECT TO authenticated USING (public.is_super_admin());

CREATE POLICY "super_admin_select_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_super_admin());

CREATE POLICY "super_admin_all_products" ON public.products
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_categories" ON public.categories
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_customers" ON public.customers
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_vendors" ON public.vendors
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_sales_orders" ON public.sales_orders
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_sales_order_items" ON public.sales_order_items
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_purchase_orders" ON public.purchase_orders
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_purchase_order_items" ON public.purchase_order_items
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_bills" ON public.bills
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_deliveries" ON public.deliveries
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_payments" ON public.payments
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
