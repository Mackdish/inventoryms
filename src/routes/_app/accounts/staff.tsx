import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/accounts/staff")({
  head: () => ({ meta: [{ title: "Staff — InventoryMS" }] }),
  component: StaffPage,
});

interface Staff {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

function StaffPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, status, created_at")
        .order("created_at", { ascending: true });
      if (error) toast.error(error.message);
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="text-sm text-muted-foreground">All members of your workspace.</p>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No staff members</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">
                    {r.full_name ?? "—"}
                    {r.id === profile?.id && <span className="ml-2 text-xs text-primary">(you)</span>}
                  </td>
                  <td className="px-3 py-3">{r.email}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className="border-primary/30 capitalize text-primary">{r.role}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className="capitalize">{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
