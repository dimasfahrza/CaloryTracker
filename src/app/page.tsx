import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Flame, BarChart3, Dumbbell, Scale } from "lucide-react";

export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="container py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold">CaloryTracker</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost px-3 py-2 text-sm rounded-lg">Log in</Link>
          <Link href="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </header>

      <section className="container flex-1 grid md:grid-cols-2 gap-10 items-center py-12 md:py-20">
        <div>
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight tracking-tight">
            Fuel your <span className="text-primary">goals.</span><br />
            One log at a time.
          </h1>
          <p className="text-muted mt-5 max-w-md">
            A calmer way to track calories, macros, weight, and workouts.
            Built for momentum, not micromanagement.
          </p>
          <div className="mt-7 flex gap-3">
            <Link href="/register" className="btn-primary">Create free account</Link>
            <Link href="/login" className="btn-secondary">I already have one</Link>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3 text-sm text-muted max-w-md">
            <li className="flex items-center gap-2"><Flame className="w-4 h-4 text-primary" /> Daily calorie ring</li>
            <li className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Macro tracking</li>
            <li className="flex items-center gap-2"><Scale className="w-4 h-4 text-primary" /> Weight trend</li>
            <li className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-primary" /> Workout log</li>
          </ul>
        </div>

        <div className="relative">
          <div className="card p-6">
            <div className="text-xs text-muted">Today</div>
            <div className="mt-2 flex items-center gap-6">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" stroke="rgb(31 39 48)" strokeWidth="12" fill="none" />
                  <circle cx="60" cy="60" r="52" stroke="rgb(34 197 94)" strokeWidth="12" fill="none"
                    strokeLinecap="round"
                    strokeDasharray="220 326" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-semibold">680</div>
                  <div className="text-[10px] text-muted">kcal left</div>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                {[
                  ["Protein", 110, 150, "bg-protein"],
                  ["Carbs", 180, 220, "bg-carbs"],
                  ["Fat", 52, 70, "bg-fat"],
                ].map(([l, c, t, color]) => (
                  <div key={l as string}>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">{l}</span><span>{c} / {t} g</span>
                    </div>
                    <div className="h-1.5 bg-surface2 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full ${color as string}`} style={{ width: `${(Number(c) / Number(t)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="container py-8 text-xs text-muted">© CaloryTracker. Built with Next.js & Supabase.</footer>
    </main>
  );
}
