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

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — InventoryMS" }] }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);

    const redirectUrl = `${window.location.origin}/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoading(false);
      toast.error("Sign-up failed. Please try again.");
      return;
    }

    // Ensure session is active (auto-confirm should make this immediate)
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setLoading(false);
        toast.error("Account created. Please log in.");
        nav({ to: "/login" });
        return;
      }
    }

    // Provision tenant + profile via secure server function (uses service role,
    // validates the user via JWT). Idempotent and RLS-safe.
    try {
      await ensureTenantForCurrentUser({ businessName, fullName });
    } catch (e: any) {
      setLoading(false);
      toast.error(e?.message ?? "Could not create workspace.");
      return;
    }

    setLoading(false);
    toast.success("Welcome to InventoryMS! Your 7-day trial has started.");
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
          <h2 className="text-3xl font-bold">Start your 7-day free trial.</h2>
          <ul className="mt-4 space-y-2 text-sm opacity-90">
            <li>• No credit card required</li>
            <li>• Pay with M-Pesa after trial</li>
            <li>• Cancel anytime</li>
          </ul>
        </div>
        <p className="text-sm opacity-70">© {new Date().getFullYear()} InventoryMS</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold">Create your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your business in under a minute.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="biz">Business name</Label>
              <Input id="biz" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1.5" placeholder="Acme Traders Ltd" />
            </div>
            <div>
              <Label htmlFor="full">Your full name</Label>
              <Input id="full" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pwd">Password</Label>
              <Input id="pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">At least 6 characters.</p>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:opacity-90">
              {loading ? "Creating workspace..." : "Create workspace"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
