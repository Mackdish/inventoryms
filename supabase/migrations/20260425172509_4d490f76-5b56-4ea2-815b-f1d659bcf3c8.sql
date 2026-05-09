ALTER FUNCTION public.tg_sales_order_items_tenant_guard()    SET search_path = public;
ALTER FUNCTION public.tg_purchase_order_items_tenant_guard() SET search_path = public;
ALTER FUNCTION public.tg_sales_orders_tenant_guard()         SET search_path = public;
ALTER FUNCTION public.tg_purchase_orders_tenant_guard()      SET search_path = public;
ALTER FUNCTION public.tg_deliveries_tenant_guard()           SET search_path = public;
ALTER FUNCTION public.tg_products_tenant_guard()             SET search_path = public;
ALTER FUNCTION public.tg_invoices_tenant_guard()             SET search_path = public;
ALTER FUNCTION public.tg_payments_tenant_guard()             SET search_path = public;