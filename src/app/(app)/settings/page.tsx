import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardSub } from "@/components/ui/card";
import { signOut } from "@/actions/auth";
import { SettingsForm } from "./settings-form";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Tune your goals so the dashboard reflects what matters to you.</p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Account</CardTitle>
            <CardSub>{user?.email}</CardSub>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </form>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile & goals</CardTitle>
            <CardSub>We can suggest calorie + macro targets from these numbers.</CardSub>
          </div>
        </CardHeader>
        <SettingsForm profile={profile as Profile} />
      </Card>
    </div>
  );
}
