import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Package, Users, Truck, TrendingUp } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — InventoryMS" }] }),
  component: Dashboard,
});

interface Stat {
  label: string;
  value: number | string;
  change: string;
  icon: React.ElementType;
  color: string; // css var
}

function Dashboard() {
  const { tenant } = useAuth();
  const [stats, setStats] = useState({ products: 0, staff: 0, deliveries: 0, sales: 0 });
  const [catData, setCatData] = useState<{ name: string; value: number }[]>([]);
  const [salesData, setSalesData] = useState<{ date: string; sales: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      setLoading(true);

      // Build a stable 14-day window using LOCAL dates (matches order_date which is a DATE).
      // Using toISOString() would shift the day in non-UTC timezones — keep everything local.
      const toLocalKey = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      const safeNum = (v: unknown): number => {
        if (v === null || v === undefined) return 0;
        const n = typeof v === "number" ? v : parseFloat(String(v));
        return Number.isFinite(n) ? n : 0;
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const windowStart = new Date(today);
      windowStart.setDate(windowStart.getDate() - 13);
      const windowStartKey = toLocalKey(windowStart);

      const [
        { count: products },
        { count: staff },
        { data: prodList },
        { count: pendingDeliveries },
        { data: salesRows },
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("category_id, categories(name)").limit(500),
        supabase.from("deliveries").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("sales_orders")
          .select("total_amount, order_date")
          .gte("order_date", windowStartKey),
      ]);

      type SalesRow = { total_amount: number | string | null; order_date: string | null };
      const rows = (salesRows ?? []) as SalesRow[];

      // Pre-seed buckets for every day in the window so empty days render as 0.
      const buckets = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        const d = new Date(windowStart);
        d.setDate(windowStart.getDate() + i);
        buckets.set(toLocalKey(d), 0);
      }

      // Aggregate, skipping rows with null/invalid dates or amounts and clamping negatives to 0.
      let totalSales = 0;
      for (const r of rows) {
        if (!r.order_date) continue;
        // order_date is a DATE → already 'YYYY-MM-DD'. Take first 10 chars defensively
        // in case Supabase ever returns a timestamp string.
        const key = String(r.order_date).slice(0, 10);
        const amount = Math.max(0, safeNum(r.total_amount));
        if (amount === 0) continue;
        totalSales += amount;
        if (buckets.has(key)) {
          buckets.set(key, (buckets.get(key) ?? 0) + amount);
        }
      }

      setStats({
        products: products ?? 0,
        staff: staff ?? 0,
        deliveries: pendingDeliveries ?? 0,
        sales: totalSales,
      });

      // Category distribution
      const byCat = new Map<string, number>();
      (prodList ?? []).forEach((p: any) => {
        const n = p.categories?.name ?? "Uncategorised";
        byCat.set(n, (byCat.get(n) ?? 0) + 1);
      });
      setCatData(Array.from(byCat, ([name, value]) => ({ name, value })));

      setSalesData(
        Array.from(buckets, ([key, sales]) => {
          const [, mm, dd] = key.split("-");
          return { date: `${parseInt(dd, 10)}/${parseInt(mm, 10)}`, sales };
        })
      );
      setLoading(false);
    })();
  }, [tenant]);

  const cards: Stat[] = [
    { label: "Total Products", value: stats.products, change: "In inventory", icon: Package, color: "var(--kpi-pink)" },
    { label: "Total Staff", value: stats.staff, change: "Active accounts", icon: Users, color: "var(--kpi-blue)" },
    { label: "Pending Deliveries", value: stats.deliveries, change: "Awaiting dispatch", icon: Truck, color: "var(--kpi-teal)" },
    { label: "Sales (14d)", value: `KSh ${stats.sales.toLocaleString()}`, change: "Last 14 days", icon: TrendingUp, color: "var(--kpi-amber)" },
  ];

  const COLORS = ["#1D9E75", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back{tenant ? `, ${tenant.name}` : ""}.</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening today.</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="mt-2 text-3xl font-bold">{c.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.change}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, ${c.color} 18%, transparent)` }}>
                <c.icon className="h-5 w-5" style={{ color: c.color }} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold">Category Distribution</h2>
            <p className="text-xs text-muted-foreground">Products grouped by category</p>
          </div>
          <div className="h-72">
            {catData.length === 0 ? (
              <EmptyChart text={loading ? "Loading..." : "No products yet"} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold">Sales Over Time</h2>
            <p className="text-xs text-muted-foreground">Last 14 days</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
