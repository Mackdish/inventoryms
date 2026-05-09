import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { slugify } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/categories/new")({
  head: () => ({ meta: [{ title: "New Category — InventoryMS" }] }),
  component: NewCategory,
});

function NewCategory() {
  const nav = useNavigate();
  const { tenant } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const slug = slugify(name);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    const { error } = await supabase.from("categories").insert({ tenant_id: tenant.id, name, slug });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Category created");
    nav({ to: "/categories" });
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/categories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to list
      </Link>
      <Card className="p-6">
        <h1 className="text-xl font-bold">New category</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Category name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            {name && <p className="mt-2 text-xs text-muted-foreground">Slug: <span className="font-mono text-foreground">{slug}</span></p>}
          </div>
          <div className="flex justify-end gap-2">
            <Link to="/categories"><Button type="button" variant="outline">Cancel</Button></Link>
            <Button type="submit" disabled={loading} className="bg-primary hover:opacity-90">
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
