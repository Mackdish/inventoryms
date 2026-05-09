import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/categories/$id")({
  head: () => ({ meta: [{ title: "Category — InventoryMS" }] }),
  component: CategoryDetail,
});

function CategoryDetail() {
  const { id } = useParams({ from: "/_app/categories/$id" });
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("categories").select("*").eq("id", id).maybeSingle();
      if (data) setName(data.name);
      setLoading(false);
    })();
  }, [id]);

  const save = async () => {
    const { error } = await supabase.from("categories").update({ name, slug: slugify(name) }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category updated");
    setEditing(false);
  };

  const remove = async () => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category deleted");
    nav({ to: "/categories" });
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/categories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to list
      </Link>
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Category details</h1>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-9 w-9 text-warning hover:bg-warning/10" onClick={() => setEditing((v) => !v)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDel(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} disabled={!editing} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slugify(name)} disabled className="mt-1.5 font-mono" />
          </div>
          {editing && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={save} className="bg-primary hover:opacity-90">Save</Button>
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
