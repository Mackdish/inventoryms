import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus, FileSpreadsheet, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { exportToExcel, formatDateDMY } from "@/lib/format";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/deliveries")({
  head: () => ({ meta: [{ title: "Package — InventoryMS" }] }),
  component: DeliveriesPage,
});

interface Customer { id: string; name: string }
interface Delivery {
  id: string;
  name: string;
  customer_name: string | null;
  delivery_date: string;
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  address: string | null;
}

const STATUS_VARIANT: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  in_transit: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  delivered: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

function DeliveriesPage() {
  const { tenant } = useAuth();
  const [rows, setRows] = useState<Delivery[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [form, setForm] = useState({
    name: "", customer_id: "", customer_name: "",
    delivery_date: new Date().toISOString().slice(0, 10),
    status: "pending" as Delivery["status"], address: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("deliveries").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name").order("name"),
    ]);
    setRows((d as any) ?? []);
    setCustomers((c as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || (r.customer_name ?? "").toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const openNew = () => {
    setEditing(null);
    setForm({
      name: `PKG-${Date.now().toString().slice(-6)}`,
      customer_id: "", customer_name: "",
      delivery_date: new Date().toISOString().slice(0, 10),
      status: "pending", address: "",
    });
    setOpen(true);
  };

  const openEdit = (d: Delivery) => {
    setEditing(d);
    setForm({
      name: d.name,
      customer_id: "", customer_name: d.customer_name ?? "",
      delivery_date: d.delivery_date,
      status: d.status, address: d.address ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!tenant) return toast.error("No workspace");
    if (!form.name.trim()) return toast.error("Name is required");
    const cust = customers.find((c) => c.id === form.customer_id);
    const customer_name = cust?.name || form.customer_name.trim() || null;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      customer_id: form.customer_id || null,
      customer_name,
      delivery_date: form.delivery_date,
      status: form.status,
      address: form.address.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("deliveries").update(payload).eq("id", editing.id)
      : await supabase.from("deliveries").insert({ ...payload, tenant_id: tenant.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Delivery updated" : "Delivery created");
    setOpen(false);
    load();
  };

  const doDelete = async () => {
    if (!delId) return;
    const { error } = await supabase.from("deliveries").delete().eq("id", delId);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); setRows((r) => r.filter((x) => x.id !== delId)); }
    setDelId(null);
  };

  const onExport = () => {
    exportToExcel(filtered.map((r, i) => ({
      "#": i + 1, Name: r.name, Customer: r.customer_name ?? "",
      Date: formatDateDMY(r.delivery_date), Status: r.status, Address: r.address ?? "",
    })), "deliveries");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Package / Deliveries</h1>
          <p className="text-sm text-muted-foreground">Track shipments and packages.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <FileSpreadsheet className="h-4 w-4" /> Export
          </Button>
          <Button onClick={openNew} className="gap-2 bg-primary hover:opacity-90"><Plus className="h-4 w-4" /> New Delivery</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search deliveries..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Address</th>
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
                  <td className="px-3 py-3 font-medium">{r.name}</td>
                  <td className="px-3 py-3">{r.customer_name ?? "—"}</td>
                  <td className="px-3 py-3">{formatDateDMY(r.delivery_date)}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className={STATUS_VARIANT[r.status]}>{r.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{r.address ?? "—"}</td>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Delivery" : "New Delivery"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name / Reference *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Customer</Label>
                <Select value={form.customer_id || "_none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Other —</SelectItem>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></div>
            </div>
            {!form.customer_id && (
              <div><Label>Customer name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
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
            <AlertDialogTitle>Delete this delivery?</AlertDialogTitle>
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
