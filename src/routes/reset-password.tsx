import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Package, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — InventoryMS" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase parses the recovery link and emits a PASSWORD_RECOVERY event.
  // Validate that we actually arrived here through a recovery link.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidLink(true);
        setReady(true);
      }
    });

    // Also check existing session in case the event already fired before mount
    supabase.auth.getSession().then(({ data }) => {
      // A session here without a recovery event means the user is already logged in
      // — still allow them to update their password from this page.
      if (data.session) {
        setValidLink(true);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    // Sign out so the user logs in fresh with their new password
    await supabase.auth.signOut();
    setTimeout(() => nav({ to: "/login" }), 1500);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-md p-8">
        <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to log in
        </Link>

        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">InventoryMS</span>
        </div>

        {!ready ? (
          <div className="grid h-32 place-items-center text-sm text-muted-foreground">Loading...</div>
        ) : done ? (
          <div className="space-y-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">Password updated</h1>
            <p className="text-sm text-muted-foreground">Redirecting you to log in...</p>
          </div>
        ) : !validLink ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Invalid or expired link</h1>
            <p className="text-sm text-muted-foreground">
              This password reset link is no longer valid. Request a new one to continue.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full bg-primary hover:opacity-90">Request new link</Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Set a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a strong password you haven't used before.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:opacity-90">
                {loading ? "Updating..." : "Update password"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
