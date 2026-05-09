import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureTenantForCurrentUser } from "@/lib/ensure-tenant";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — InventoryMS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Ensure the user has a tenant + profile before any RLS-protected query runs.
    try {
      await ensureTenantForCurrentUser();
    } catch (e: any) {
      setLoading(false);
      toast.error(e?.message ?? "Could not initialize your workspace.");
      return;
    }

    setLoading(false);
    toast.success("Welcome back!");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-primary to-primary/70 p-12 text-primary-foreground md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-white/15">
            <Package className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">InventoryMS</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Welcome back.</h2>
          <p className="mt-3 max-w-sm opacity-90">Pick up exactly where you left off — your stock, sales and customers are waiting.</p>
        </div>
        <p className="text-sm opacity-70">© {new Date().getFullYear()} InventoryMS</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold">Log in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your details to continue.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:opacity-90">
              {loading ? "Signing in..." : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here? <Link to="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
