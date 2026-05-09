import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, FileSpreadsheet, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToExcel, formatKsh, formatDateDMY } from "@/lib/format";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/products/")({
  head: () => ({ meta: [{ title: "Products — InventoryMS" }] }),
  component: ProductsList,
});

interface Row {
  id: string;
  name: string;
  quantity: number;
  selling_price: number;
  expiring_date: string | null;
  category_id: string | null;
  vendor_id: string | null;
  categories: { name: string } | null;
  vendors: { name: string } | null;
}

function ProductsList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [delId, setDelId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, quantity, selling_price, expiring_date, category_id, vendor_id, categories(name), vendors(name)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const doDelete = async () => {
    if (!delId) return;
    const { error } = await supabase.from("products").delete().eq("id", delId);
    if (error) toast.error(error.message);
    else {
      toast.success("Product deleted");
      setRows((r) => r.filter((x) => x.id !== delId));
    }
    setDelId(null);
  };

  const onExport = () => {
    exportToExcel(
      filtered.map((r, i) => ({
        "#": i + 1,
        Name: r.name,
        Category: r.categories?.name ?? "",
        Quantity: r.quantity,
        "Price (KSh)": Number(r.selling_price),
        "Expiring Date": formatDateDMY(r.expiring_date),
        Vendor: r.vendors?.name ?? "",
      })),
      "products"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your inventory items.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <FileSpreadsheet className="h-4 w-4" /> Export to Excel
          </Button>
          <Button onClick={() => nav({ to: "/products/new" })} className="gap-2 bg-primary hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Qty</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Expires</th>
                <th className="px-3 py-3">Vendor</th>
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
                  <td className="px-3 py-3 font-medium">{r.name}</td>
                  <td className="px-3 py-3">{r.categories?.name ?? "—"}</td>
                  <td className="px-3 py-3">{r.quantity}</td>
                  <td className="px-3 py-3">{formatKsh(r.selling_price)}</td>
                  <td className="px-3 py-3">{formatDateDMY(r.expiring_date)}</td>
                  <td className="px-3 py-3">{r.vendors?.name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <Link to="/products/$id/edit" params={{ id: r.id }}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-warning hover:bg-warning/10">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
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

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
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
