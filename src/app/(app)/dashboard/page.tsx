import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardSub } from "@/components/ui/card";
import { CalorieRing } from "@/components/widgets/calorie-ring";
import { MacroBar } from "@/components/widgets/macro-bar";
import { EmptyState } from "@/components/widgets/empty-state";
import { todayISO, formatNumber } from "@/lib/utils";
import { Plus, UtensilsCrossed, Dumbbell, Scale } from "lucide-react";
import type { Profile, FoodLog, Workout, WeightLog } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = todayISO();

  const [profileRes, logsRes, workoutsRes, weightRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("food_logs").select("*").eq("logged_on", today).order("logged_at", { ascending: true }),
    supabase.from("workouts").select("*").eq("performed_on", today).order("created_at", { ascending: false }),
    supabase.from("weight_logs").select("*").order("logged_on", { ascending: false }).limit(1),
  ]);

  const profile = (profileRes.data ?? null) as Profile | null;
  const logs = (logsRes.data ?? []) as FoodLog[];
  const workouts = (workoutsRes.data ?? []) as Workout[];
  const latestWeight = ((weightRes.data ?? [])[0] ?? null) as WeightLog | null;

  const totals = logs.reduce(
    (acc, l) => ({
      cal: acc.cal + Number(l.calories),
      p: acc.p + Number(l.protein_g),
      c: acc.c + Number(l.carbs_g),
      f: acc.f + Number(l.fat_g),
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );
  const burned = workouts.reduce((s, w) => s + (w.calories_burned ?? 0), 0);

  const calorieTarget = profile?.daily_calorie_target ?? 2000;
  const proteinTarget = profile?.protein_target_g ?? 150;
  const carbsTarget = profile?.carbs_target_g ?? 220;
  const fatTarget = profile?.fat_target_g ?? 70;

  const greeting = greet();
  const name = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}, {name}.</h1>
          <p className="text-sm text-muted">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/food" className="btn-primary text-sm hidden sm:inline-flex">
          <Plus className="w-4 h-4" /> Log food
        </Link>
      </div>

      {/* Today summary */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Today</CardTitle>
            <CardSub>Eaten {formatNumber(totals.cal)} · Burned {formatNumber(burned)} · Target {formatNumber(calorieTarget)}</CardSub>
          </div>
          <Link href="/food" className="text-xs text-primary">Log</Link>
        </CardHeader>

        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
          <div className="flex-shrink-0 self-center">
            <CalorieRing consumed={totals.cal} burned={burned} target={calorieTarget} />
          </div>
          <div className="flex-1 w-full grid grid-cols-1 gap-4 self-center">
            <MacroBar label="Protein" current={totals.p} target={proteinTarget} color="protein" />
            <MacroBar label="Carbs" current={totals.c} target={carbsTarget} color="carbs" />
            <MacroBar label="Fat" current={totals.f} target={fatTarget} color="fat" />
          </div>
        </div>
      </Card>

      {/* Three quick cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/food" className="card hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Meals today</div>
            <UtensilsCrossed className="w-4 h-4 text-muted" />
          </div>
          <div className="mt-2 text-3xl font-semibold">{logs.length}</div>
          <div className="text-xs text-muted mt-1">{formatNumber(totals.cal)} kcal eaten</div>
        </Link>

        <Link href="/workouts" className="card hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Workouts today</div>
            <Dumbbell className="w-4 h-4 text-muted" />
          </div>
          <div className="mt-2 text-3xl font-semibold">{workouts.length}</div>
          <div className="text-xs text-muted mt-1">{formatNumber(burned)} kcal burned</div>
        </Link>

        <Link href="/weight" className="card hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Current weight</div>
            <Scale className="w-4 h-4 text-muted" />
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {latestWeight ? `${formatNumber(Number(latestWeight.weight_kg), 1)}` : "—"}
            <span className="text-base text-muted ml-1">kg</span>
          </div>
          <div className="text-xs text-muted mt-1">
            {latestWeight ? `as of ${new Date(latestWeight.logged_on).toLocaleDateString()}` : "Tap to add today's weigh-in"}
          </div>
        </Link>
      </div>

      {/* Today's meals */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s meals</CardTitle>
          <Link href="/food" className="text-xs text-primary">View all</Link>
        </CardHeader>
        {logs.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="w-5 h-5" />}
            title="Nothing logged yet"
            description="Add your first meal to start filling the ring."
            action={<Link className="btn-primary text-sm" href="/food"><Plus className="w-4 h-4" /> Log food</Link>}
          />
        ) : (
          <ul className="divide-y divide-border">
            {logs.slice(0, 6).map((l) => (
              <li key={l.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.food_name}</div>
                  <div className="text-xs text-muted capitalize">
                    {l.meal} · {Number(l.servings)}× · {formatNumber(Number(l.protein_g))}P / {formatNumber(Number(l.carbs_g))}C / {formatNumber(Number(l.fat_g))}F
                  </div>
                </div>
                <div className="text-sm tabular-nums">{formatNumber(Number(l.calories))} kcal</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
