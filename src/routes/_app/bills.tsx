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
import { exportToExcel, formatKsh, formatDateDMY } from "@/lib/format";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/bills")({
  head: () => ({ meta: [{ title: "Bills — InventoryMS" }] }),
  component: BillsPage,
});

interface Bill {
  id: string;
  institution_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  amount: number;
  payment_details: string | null;
  status: "paid" | "unpaid" | "pending";
  created_at: string;
}

const STATUS_VARIANT: Record<string, string> = {
  paid: "bg-primary/15 text-primary border-primary/30",
  unpaid: "bg-destructive/15 text-destructive border-destructive/30",
  pending: "bg-warning/15 text-warning border-warning/30",
};

function BillsPage() {
  const { tenant } = useAuth();
  const [rows, setRows] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [form, setForm] = useState({
    institution_name: "", phone: "", email: "", address: "",
    description: "", amount: "0", payment_details: "",
    status: "unpaid" as Bill["status"],
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("bills").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.institution_name.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const openNew = () => {
    setEditing(null);
    setForm({
      institution_name: "", phone: "", email: "", address: "",
      description: "", amount: "0", payment_details: "", status: "unpaid",
    });
    setOpen(true);
  };

  const openEdit = (b: Bill) => {
    setEditing(b);
    setForm({
      institution_name: b.institution_name,
      phone: b.phone ?? "", email: b.email ?? "", address: b.address ?? "",
      description: b.description ?? "", amount: String(b.amount),
      payment_details: b.payment_details ?? "", status: b.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!tenant) return toast.error("No workspace");
    if (!form.institution_name.trim()) return toast.error("Institution name required");
    setSaving(true);
    const payload = {
      institution_name: form.institution_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      description: form.description.trim() || null,
      amount: Number(form.amount) || 0,
      payment_details: form.payment_details.trim() || null,
      status: form.status,
    };
    const { error } = editing
      ? await supabase.from("bills").update(payload).eq("id", editing.id)
      : await supabase.from("bills").insert({ ...payload, tenant_id: tenant.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Bill updated" : "Bill created");
    setOpen(false);
    load();
  };

  const doDelete = async () => {
    if (!delId) return;
    const { error } = await supabase.from("bills").delete().eq("id", delId);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); setRows((r) => r.filter((x) => x.id !== delId)); }
    setDelId(null);
  };

  const onExport = () => {
    exportToExcel(filtered.map((r, i) => ({
      "#": i + 1, Institution: r.institution_name, Phone: r.phone ?? "",
      Email: r.email ?? "", Description: r.description ?? "",
      Amount: Number(r.amount), Status: r.status, Date: formatDateDMY(r.created_at),
    })), "bills");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bills</h1>
          <p className="text-sm text-muted-foreground">Track payable bills and expenses.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <FileSpreadsheet className="h-4 w-4" /> Export
          </Button>
          <Button onClick={openNew} className="gap-2 bg-primary hover:opacity-90"><Plus className="h-4 w-4" /> New Bill</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search bills..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Institution</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No data available in table</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">{r.institution_name}</td>
                  <td className="px-3 py-3">{r.phone ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{r.description ?? "—"}</td>
                  <td className="px-3 py-3 font-semibold">{formatKsh(r.amount)}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className={STATUS_VARIANT[r.status]}>{r.status}</Badge>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Bill" : "New Bill"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Institution Name *</Label><Input value={form.institution_name} onChange={(e) => setForm({ ...form, institution_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Amount (KSh)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Payment Details</Label><Textarea rows={2} value={form.payment_details} onChange={(e) => setForm({ ...form, payment_details: e.target.value })} placeholder="M-Pesa Paybill, account number, etc." /></div>
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
            <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
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
