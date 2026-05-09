import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, FileSpreadsheet, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { exportToExcel, formatKsh, formatDateDMY } from "@/lib/format";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({ meta: [{ title: "Sales Orders — InventoryMS" }] }),
  component: SalesPage,
});

interface Customer { id: string; name: string }
interface Product { id: string; name: string; selling_price: number }
interface SalesOrder {
  id: string;
  order_no: string;
  customer_name: string | null;
  order_date: string;
  total_amount: number;
  status: "pending" | "completed" | "cancelled";
  notes: string | null;
}

const STATUS_VARIANT: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

function SalesPage() {
  const { tenant } = useAuth();
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SalesOrder | null>(null);
  const [form, setForm] = useState({
    order_no: "",
    customer_id: "",
    customer_name: "",
    order_date: new Date().toISOString().slice(0, 10),
    product_id: "",
    quantity: "1",
    unit_price: "0",
    status: "pending" as SalesOrder["status"],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: o }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("sales_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("products").select("id, name, selling_price").order("name"),
    ]);
    setRows((o as any) ?? []);
    setCustomers((c as any) ?? []);
    setProducts((p as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.order_no.toLowerCase().includes(q.toLowerCase()) || (r.customer_name ?? "").toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const openNew = () => {
    setEditing(null);
    setForm({
      order_no: `SO-${Date.now().toString().slice(-6)}`,
      customer_id: "", customer_name: "",
      order_date: new Date().toISOString().slice(0, 10),
      product_id: "", quantity: "1", unit_price: "0",
      status: "pending", notes: "",
    });
    setOpen(true);
  };

  const openEdit = (s: SalesOrder) => {
    setEditing(s);
    setForm({
      order_no: s.order_no,
      customer_id: "", customer_name: s.customer_name ?? "",
      order_date: s.order_date,
      product_id: "", quantity: "1", unit_price: String(s.total_amount),
      status: s.status, notes: s.notes ?? "",
    });
    setOpen(true);
  };

  const onProductChange = (id: string) => {
    const p = products.find((x) => x.id === id);
    setForm((f) => ({ ...f, product_id: id, unit_price: p ? String(p.selling_price) : f.unit_price }));
  };

  const total = (Number(form.quantity) || 0) * (Number(form.unit_price) || 0);

  const save = async () => {
    if (!tenant) return toast.error("No workspace");
    if (!form.order_no.trim()) return toast.error("Order # required");
    const cust = customers.find((c) => c.id === form.customer_id);
    const customer_name = cust?.name || form.customer_name.trim() || null;
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("sales_orders").update({
        order_no: form.order_no.trim(),
        customer_id: form.customer_id || null,
        customer_name,
        order_date: form.order_date,
        total_amount: total || Number(form.unit_price) || 0,
        status: form.status,
        notes: form.notes.trim() || null,
      }).eq("id", editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Order updated");
    } else {
      const { data: order, error } = await supabase.from("sales_orders").insert({
        tenant_id: tenant.id,
        order_no: form.order_no.trim(),
        customer_id: form.customer_id || null,
        customer_name,
        order_date: form.order_date,
        total_amount: total,
        status: form.status,
        notes: form.notes.trim() || null,
      }).select("id").single();
      if (error || !order) { setSaving(false); return toast.error(error?.message ?? "Failed"); }
      // Add line item if product selected
      if (form.product_id) {
        const product = products.find((p) => p.id === form.product_id);
        await supabase.from("sales_order_items").insert({
          tenant_id: tenant.id,
          sales_order_id: order.id,
          product_id: form.product_id,
          product_name: product?.name ?? "",
          quantity: Number(form.quantity) || 1,
          unit_price: Number(form.unit_price) || 0,
          total,
        });
      }
      setSaving(false);
      toast.success("Order created");
    }
    setOpen(false);
    load();
  };

  const doDelete = async () => {
    if (!delId) return;
    const { error } = await supabase.from("sales_orders").delete().eq("id", delId);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); setRows((r) => r.filter((x) => x.id !== delId)); }
    setDelId(null);
  };

  const onExport = () => {
    exportToExcel(filtered.map((r, i) => ({
      "#": i + 1, "Order #": r.order_no, Customer: r.customer_name ?? "",
      Date: formatDateDMY(r.order_date), Total: Number(r.total_amount), Status: r.status,
    })), "sales-orders");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sales Orders</h1>
          <p className="text-sm text-muted-foreground">Track customer orders.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <FileSpreadsheet className="h-4 w-4" /> Export
          </Button>
          <Button onClick={openNew} className="gap-2 bg-primary hover:opacity-90"><Plus className="h-4 w-4" /> New Order</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search orders..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Order #</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No data available in table</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">{r.order_no}</td>
                  <td className="px-3 py-3">{r.customer_name ?? "—"}</td>
                  <td className="px-3 py-3">{formatDateDMY(r.order_date)}</td>
                  <td className="px-3 py-3 font-semibold">{formatKsh(r.total_amount)}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-warning hover:bg-warning/10" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDelId(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Sales Order" : "New Sales Order"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Order # *</Label><Input value={form.order_no} onChange={(e) => setForm({ ...form, order_no: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Label>Customer</Label>
              <Select value={form.customer_id || "_none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Walk-in / Other —</SelectItem>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!form.customer_id && (
              <div className="sm:col-span-2"><Label>Customer name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Walk-in customer" />
              </div>
            )}
            {!editing && (
              <>
                <div className="sm:col-span-2">
                  <Label>Product</Label>
                  <Select value={form.product_id || "_none"} onValueChange={(v) => onProductChange(v === "_none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— None —</SelectItem>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Unit Price (KSh)</Label><Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
              </>
            )}
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Total</Label><Input value={formatKsh(total)} disabled /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-primary hover:opacity-90">{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
