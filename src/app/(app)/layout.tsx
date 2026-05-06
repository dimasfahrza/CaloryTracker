import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { MobileNav } from "@/components/nav/mobile-nav";
import { ChatWidget } from "@/components/chat/chat-widget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex">
      <Sidebar userName={profile?.full_name ?? profile?.email ?? "You"} />
      <div className="flex-1 md:pl-60">
        <main className="container py-6 pb-24 md:pb-12">{children}</main>
      </div>
      <MobileNav />
      <ChatWidget />
    </div>
  );
}
