import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — InventoryMS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refresh } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [pwd, setPwd] = useState("");
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refresh();
  };

  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Password must be at least 6 characters.");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPwd("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card className="p-6">
        <h2 className="font-semibold">Account info</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="mt-1.5" />
          </div>
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={profile?.role ?? ""} disabled className="mt-1.5 capitalize" />
          </div>
          <Button type="submit" disabled={saving} className="bg-primary hover:opacity-90">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold">Change password</h2>
        <form onSubmit={changePwd} className="mt-4 space-y-4">
          <div>
            <Label>New password</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" className="bg-primary hover:opacity-90">Update password</Button>
        </form>
      </Card>
    </div>
  );
}
