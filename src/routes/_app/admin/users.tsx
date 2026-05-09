import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import {
  callAdminListUsers as adminListUsers,
  callAdminGrantAccess as adminGrantAccess,
  callAdminRevokeAccess as adminRevokeAccess,
  callAdminSetUserStatus as adminSetUserStatus,
  callAdminGrantUserAccess as adminGrantUserAccess,
  callAdminRevokeUserAccess as adminRevokeUserAccess,
} from "@/lib/admin-client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Ban, CheckCircle2, Calendar } from "lucide-react";
import { formatDateDMY } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Admin — Users" }] }),
  component: AdminUsers,
});

interface Row {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  tenant_id: string | null;
  access_expires_at: string | null;
  created_at: string;
  tenant: {
    id: string;
    name: string;
    subscription_status: string;
    trial_ends_at: string;
    subscription_expires_at: string | null;
  } | null;
}

function AdminUsers() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [days, setDays] = useState<Record<string, number>>({});
  const [userDays, setUserDays] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const grantUser = async (userId: string, d: number) => {
    setBusyId(userId);
    try {
      await adminGrantUserAccess(userId, d);
      toast.success(`Granted ${d} days to user`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const revokeUser = async (userId: string) => {
    if (!confirm("Revoke this user's access immediately?")) return;
    setBusyId(userId);
    try {
      await adminRevokeUserAccess(userId);
      toast.success("User access revoked");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminListUsers();
      setRows(res.users as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isSuperAdmin) {
        nav({ to: "/dashboard" });
        return;
      }
      load();
    }
  }, [authLoading, isSuperAdmin, nav]);

  const grant = async (tenantId: string, d: number) => {
    setBusyId(tenantId);
    try {
      await adminGrantAccess(tenantId, d);
      toast.success(`Granted ${d} days`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (tenantId: string) => {
    if (!confirm("Revoke access immediately?")) return;
    setBusyId(tenantId);
    try {
      await adminRevokeAccess(tenantId);
      toast.success("Access revoked");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (userId: string, current: string) => {
    const next = current === "active" ? "suspended" : "active";
    setBusyId(userId);
    try {
      await adminSetUserStatus(userId, next);
      toast.success(`User ${next}`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.email.toLowerCase().includes(q) || (r.full_name ?? "").toLowerCase().includes(q) || (r.tenant?.name ?? "").toLowerCase().includes(q);
  });

  if (authLoading || loading) {
    return <div className="grid h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users & Workspaces</h1>
          <p className="text-sm text-muted-foreground">Manage all signed-up users and their subscription access.</p>
        </div>
        <Input placeholder="Search email, name, workspace…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Workspace</th>
              <th className="p-3">Subscription</th>
              <th className="p-3">Expires</th>
              <th className="p-3">Status</th>
              <th className="p-3">Workspace grant</th>
              <th className="p-3">User access</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const d = days[r.tenant_id ?? r.id] ?? 30;
              const ud = userDays[r.id] ?? 30;
              const userExpired = r.access_expires_at ? new Date(r.access_expires_at).getTime() <= Date.now() : false;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{r.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wide text-primary">{r.role}</div>
                  </td>
                  <td className="p-3">{r.tenant?.name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.tenant?.subscription_status === "active" ? "bg-green-100 text-green-700" :
                      r.tenant?.subscription_status === "trial" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {r.tenant?.subscription_status ?? "—"}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    {r.tenant?.subscription_expires_at
                      ? formatDateDMY(r.tenant.subscription_expires_at)
                      : r.tenant?.trial_ends_at ? `trial ${formatDateDMY(r.tenant.trial_ends_at)}` : "—"}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs ${r.status === "active" ? "text-green-700" : "text-red-700"}`}>{r.status}</span>
                  </td>
                  <td className="p-3">
                    {r.tenant_id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={d}
                          onChange={(e) => setDays({ ...days, [r.tenant_id!]: Number(e.target.value) })}
                          className="h-8 w-20"
                        />
                        <span className="text-xs text-muted-foreground">days</span>
                        <Button size="sm" disabled={busyId === r.tenant_id} onClick={() => grant(r.tenant_id!, d)} className="h-8 gap-1">
                          <Calendar className="h-3 w-3" /> Grant
                        </Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">no workspace</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={ud}
                          onChange={(e) => setUserDays({ ...userDays, [r.id]: Number(e.target.value) })}
                          className="h-8 w-20"
                        />
                        <span className="text-xs text-muted-foreground">days</span>
                        <Button size="sm" disabled={busyId === r.id} onClick={() => grantUser(r.id, ud)} className="h-8 gap-1">
                          <Calendar className="h-3 w-3" /> Grant
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => revokeUser(r.id)} className="h-8 gap-1">
                          <Ban className="h-3 w-3" /> Revoke
                        </Button>
                      </div>
                      <span className={`text-[10px] ${userExpired ? "text-red-700" : "text-muted-foreground"}`}>
                        {r.access_expires_at ? `until ${formatDateDMY(r.access_expires_at)}${userExpired ? " (expired)" : ""}` : "no per-user limit"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      {r.tenant_id && (
                        <Button size="sm" variant="outline" disabled={busyId === r.tenant_id} onClick={() => revoke(r.tenant_id!)} className="h-8 gap-1">
                          <Ban className="h-3 w-3" /> Revoke
                        </Button>
                      )}
                      <Button size="sm" variant={r.status === "active" ? "outline" : "default"} disabled={busyId === r.id} onClick={() => toggleStatus(r.id, r.status)} className="h-8 gap-1">
                        {r.status === "active" ? <><Ban className="h-3 w-3"/>Suspend</> : <><CheckCircle2 className="h-3 w-3"/>Activate</>}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
