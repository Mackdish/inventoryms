import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  Truck,
  FileText,
  Users,
  BarChart3,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InventoryMS — Smart inventory for growing businesses" },
      { name: "description", content: "All-in-one inventory, sales and billing for Kenyan SMEs. Pay with M-Pesa. 7-day free trial." },
      { property: "og:title", content: "InventoryMS — Smart inventory" },
      { property: "og:description", content: "Manage stock, sales and deliveries from one dashboard." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Package, title: "Products & Stock", desc: "Track quantities, expiry dates and vendors per item." },
  { icon: ShoppingCart, title: "Sales Orders", desc: "Quick checkout with tax, discounts and change calculation." },
  { icon: Truck, title: "Purchases & Deliveries", desc: "Manage incoming stock and outgoing deliveries with statuses." },
  { icon: FileText, title: "Invoices & Bills", desc: "Generate printable invoices and record business bills." },
  { icon: Users, title: "Staff & Customers", desc: "Role-based access with customer loyalty points." },
  { icon: BarChart3, title: "Insightful Dashboard", desc: "KPIs and charts that show what's happening today." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">InventoryMS</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-primary hover:opacity-90">Start free trial</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container mx-auto grid items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> Built for Kenyan SMEs
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
              Manage your inventory <span className="text-primary">smarter</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              One simple dashboard for products, sales, purchases, deliveries and bills. Pay monthly with M-Pesa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg" className="bg-primary hover:opacity-90">
                  Start 7-day free trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#pricing"><Button size="lg" variant="outline">See pricing</Button></a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No credit card required. Cancel anytime.</p>
          </div>

          <div className="relative">
            <div className="rounded-2xl border bg-card p-2 shadow-2xl shadow-primary/10">
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground">
                <div className="text-sm opacity-80">Total Sales (today)</div>
                <div className="mt-1 text-3xl font-bold">KSh 184,250</div>
                <div className="mt-1 text-xs opacity-80">↑ 12% since yesterday</div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                {[
                  { l: "Products", v: "342", c: "var(--kpi-pink)" },
                  { l: "Staff", v: "8", c: "var(--kpi-blue)" },
                  { l: "Pending", v: "12", c: "var(--kpi-teal)" },
                  { l: "Sales", v: "57", c: "var(--kpi-amber)" },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg bg-muted/40 p-3">
                    <div className="h-1 w-8 rounded" style={{ backgroundColor: k.c }} />
                    <div className="mt-2 text-xs text-muted-foreground">{k.l}</div>
                    <div className="text-lg font-semibold">{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Everything you need to run a stockroom</h2>
          <p className="mt-3 text-muted-foreground">From the front counter to the back office — covered.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6 transition hover:shadow-lg hover:shadow-primary/10">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">One simple price</h2>
            <p className="mt-3 text-muted-foreground">Pay monthly with M-Pesa. No hidden fees.</p>
          </div>
          <div className="mx-auto mt-12 max-w-md">
            <Card className="overflow-hidden border-2 border-primary/30 shadow-xl shadow-primary/10">
              <div className="bg-primary p-6 text-primary-foreground">
                <div className="text-sm opacity-90">Pro Plan</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-5xl font-bold">KES 2,000</span>
                  <span className="opacity-90">/month</span>
                </div>
              </div>
              <div className="space-y-3 p-6">
                {[
                  "Unlimited products & categories",
                  "Sales, purchases & deliveries",
                  "Invoices, bills & PDF export",
                  "Customer loyalty tracking",
                  "Role-based staff access",
                  "Excel export everywhere",
                ].map((b) => (
                  <div key={b} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <span>{b}</span>
                  </div>
                ))}
                <Link to="/signup" className="block pt-3">
                  <Button size="lg" className="w-full bg-primary hover:opacity-90">
                    Start 7-day free trial
                  </Button>
                </Link>
                <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                  <span className="rounded bg-success/10 px-2 py-0.5 font-semibold text-success">M-PESA</span>
                  <span>Pay with M-Pesa STK Push</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span>© {new Date().getFullYear()} InventoryMS. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <Link to="/login" className="hover:text-foreground">Log in</Link>
          </div>
        </div>
        <div className="container mx-auto mt-6 flex flex-col items-center gap-1 px-4 text-center text-xs text-muted-foreground">
          <span>
            Powered by <span className="font-semibold text-foreground">Mackdish Solutions</span>
          </span>
          <span>
            Contact: <a href="tel:+254705186502" className="hover:text-foreground">0705186502</a>
            {" · "}
            <a href="mailto:macknonvulimu@gmail.com" className="hover:text-foreground">macknonvulimu@gmail.com</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
