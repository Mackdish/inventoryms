import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/products/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Product — InventoryMS" }] }),
  component: ProductEdit,
});

function ProductEdit() {
  const { id } = useParams({ from: "/_app/products/$id/edit" });
  return <ProductForm productId={id} />;
}

export function ProductForm({ productId }: { productId?: string }) {
  const nav = useNavigate();
  const { tenant } = useAuth();
  const isEdit = !!productId;
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", category_id: "", description: "",
    quantity: 0, selling_price: 0, expiring_date: "", vendor_id: "",
  });

  useEffect(() => {
    (async () => {
      const [c, v] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("vendors").select("id, name").order("name"),
      ]);
      setCats((c.data as any) ?? []);
      setVendors((v.data as any) ?? []);
      if (isEdit && productId) {
        const { data } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
        if (data) {
          setForm({
            name: data.name,
            category_id: data.category_id ?? "",
            description: data.description ?? "",
            quantity: data.quantity,
            selling_price: Number(data.selling_price),
            expiring_date: data.expiring_date ?? "",
            vendor_id: data.vendor_id ?? "",
          });
        }
      }
    })();
  }, [productId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    const payload = {
      tenant_id: tenant.id,
      name: form.name,
      category_id: form.category_id || null,
      description: form.description || null,
      quantity: Number(form.quantity),
      selling_price: Number(form.selling_price),
      expiring_date: form.expiring_date || null,
      vendor_id: form.vendor_id || null,
    };
    const { error } = isEdit
      ? await supabase.from("products").update(payload).eq("id", productId!)
      : await supabase.from("products").insert(payload);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Product updated" : "Product created");
    nav({ to: "/products" });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>
      <Card className="p-6">
        <h1 className="text-xl font-bold">{isEdit ? "Edit product" : "Add a new product"}</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Vendor</Label>
            <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={3} />
          </div>

          <div>
            <Label htmlFor="qty">Quantity</Label>
            <Input id="qty" type="number" min={0} required value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value || "0") })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="price">Selling price (KSh)</Label>
            <Input id="price" type="number" min={0} step="0.01" required value={form.selling_price}
              onChange={(e) => setForm({ ...form, selling_price: parseFloat(e.target.value || "0") })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="exp">Expiring date</Label>
            <Input id="exp" type="date" value={form.expiring_date}
              onChange={(e) => setForm({ ...form, expiring_date: e.target.value })} className="mt-1.5" />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Link to="/products"><Button type="button" variant="outline">Cancel</Button></Link>
            <Button type="submit" disabled={loading} className="bg-primary hover:opacity-90">
              {loading ? "Saving..." : isEdit ? "Update" : "Submit"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
