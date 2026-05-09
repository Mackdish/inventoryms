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

export const Route = createFileRoute("/_app/invoices")({
  head: () => ({ meta: [{ title: "Invoices — InventoryMS" }] }),
  component: InvoicesPage,
});

interface Product { id: string; name: string; selling_price: number }
interface Invoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  contact_number: string | null;
  product_name: string | null;
  price_per_item: number;
  quantity: number;
  shipping: number;
  total: number;
  status: string;
  created_at: string;
}

const STATUS_VARIANT: Record<string, string> = {
  paid: "bg-primary/15 text-primary border-primary/30",
  unpaid: "bg-warning/15 text-warning border-warning/30",
  pending: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

function InvoicesPage() {
  const { tenant } = useAuth();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    invoice_no: "", customer_name: "", contact_number: "",
    product_id: "", product_name: "",
    price_per_item: "0", quantity: "1", shipping: "0",
    status: "unpaid",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: i }, { data: p }] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, selling_price").order("name"),
    ]);
    setRows((i as any) ?? []);
    setProducts((p as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.invoice_no.toLowerCase().includes(q.toLowerCase()) || r.customer_name.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const openNew = () => {
    setEditing(null);
    setForm({
      invoice_no: `INV-${Date.now().toString().slice(-6)}`,
      customer_name: "", contact_number: "",
      product_id: "", product_name: "",
      price_per_item: "0", quantity: "1", shipping: "0",
      status: "unpaid",
    });
    setOpen(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      invoice_no: inv.invoice_no,
      customer_name: inv.customer_name,
      contact_number: inv.contact_number ?? "",
      product_id: "", product_name: inv.product_name ?? "",
      price_per_item: String(inv.price_per_item),
      quantity: String(inv.quantity),
      shipping: String(inv.shipping),
      status: inv.status,
    });
    setOpen(true);
  };

  const onProductChange = (id: string) => {
    const p = products.find((x) => x.id === id);
    setForm((f) => ({
      ...f, product_id: id,
      product_name: p?.name ?? f.product_name,
      price_per_item: p ? String(p.selling_price) : f.price_per_item,
    }));
  };

  const total = (Number(form.quantity) || 0) * (Number(form.price_per_item) || 0) + (Number(form.shipping) || 0);

  const save = async () => {
    if (!tenant) return toast.error("No workspace");
    if (!form.customer_name.trim()) return toast.error("Customer name required");
    setSaving(true);
    const payload = {
      invoice_no: form.invoice_no.trim(),
      customer_name: form.customer_name.trim(),
      contact_number: form.contact_number.trim() || null,
      product_id: form.product_id || null,
      product_name: form.product_name.trim() || null,
      price_per_item: Number(form.price_per_item) || 0,
      quantity: Number(form.quantity) || 1,
      shipping: Number(form.shipping) || 0,
      total,
      status: form.status,
    };
    const { error } = editing
      ? await supabase.from("invoices").update(payload).eq("id", editing.id)
      : await supabase.from("invoices").insert({ ...payload, tenant_id: tenant.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Invoice updated" : "Invoice created");
    setOpen(false);
    load();
  };

  const doDelete = async () => {
    if (!delId) return;
    const { error } = await supabase.from("invoices").delete().eq("id", delId);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); setRows((r) => r.filter((x) => x.id !== delId)); }
    setDelId(null);
  };

  const onExport = () => {
    exportToExcel(filtered.map((r, i) => ({
      "#": i + 1, "Invoice #": r.invoice_no, Customer: r.customer_name,
      Contact: r.contact_number ?? "", Product: r.product_name ?? "",
      Price: Number(r.price_per_item), Qty: Number(r.quantity), Shipping: Number(r.shipping),
      Total: Number(r.total), Status: r.status, Date: formatDateDMY(r.created_at),
    })), "invoices");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Issue and track invoices.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <FileSpreadsheet className="h-4 w-4" /> Export
          </Button>
          <Button onClick={openNew} className="gap-2 bg-primary hover:opacity-90"><Plus className="h-4 w-4" /> New Invoice</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search invoices..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Invoice #</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Qty</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">No data available in table</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">{r.invoice_no}</td>
                  <td className="px-3 py-3">{r.customer_name}</td>
                  <td className="px-3 py-3">{r.product_name ?? "—"}</td>
                  <td className="px-3 py-3">{r.quantity}</td>
                  <td className="px-3 py-3 font-semibold">{formatKsh(r.total)}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className={STATUS_VARIANT[r.status] ?? ""}>{r.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{formatDateDMY(r.created_at)}</td>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Invoice" : "New Invoice"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Invoice # *</Label><Input value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Customer Name *</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>Contact Number</Label><Input value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Label>Product</Label>
              <Select value={form.product_id || "_none"} onValueChange={(v) => onProductChange(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Custom —</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!form.product_id && (
              <div className="sm:col-span-2"><Label>Product name</Label>
                <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
              </div>
            )}
            <div><Label>Price per item</Label><Input type="number" step="0.01" value={form.price_per_item} onChange={(e) => setForm({ ...form, price_per_item: e.target.value })} /></div>
            <div><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div><Label>Shipping</Label><Input type="number" step="0.01" value={form.shipping} onChange={(e) => setForm({ ...form, shipping: e.target.value })} /></div>
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
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
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
