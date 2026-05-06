import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardSub } from "@/components/ui/card";
import { EmptyState } from "@/components/widgets/empty-state";
import { BarChart3 } from "lucide-react";
import { formatNumber, todayISO } from "@/lib/utils";
import type { FoodLog, WeightLog, Workout, Profile } from "@/types/database";
import { CaloriesChart } from "./calories-chart";
import { MacrosChart } from "./macros-chart";

export const dynamic = "force-dynamic";

const RANGE_DAYS = 30;

export default async function AnalyticsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (RANGE_DAYS - 1));
  const startISO = start.toISOString().slice(0, 10);

  const [foodRes, weightRes, workoutRes, profileRes] = await Promise.all([
    supabase.from("food_logs").select("*").eq("user_id", user!.id).gte("logged_on", startISO),
    supabase.from("weight_logs").select("*").eq("user_id", user!.id).gte("logged_on", startISO).order("logged_on"),
    supabase.from("workouts").select("*").eq("user_id", user!.id).gte("performed_on", startISO),
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
  ]);

  const foods = (foodRes.data ?? []) as FoodLog[];
  const weights = (weightRes.data ?? []) as WeightLog[];
  const workouts = (workoutRes.data ?? []) as Workout[];
  const profile = profileRes.data as Profile | null;

  // Build per-day series for the full range so empty days show as zero.
  const days: string[] = [];
  for (let i = 0; i < RANGE_DAYS; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  const byDay = Object.fromEntries(days.map((d) => [d, { date: d, kcal: 0, p: 0, c: 0, f: 0, burned: 0 }]));
  for (const f of foods) {
    const day = byDay[f.logged_on];
    if (!day) continue;
    day.kcal += Number(f.calories);
    day.p += Number(f.protein_g);
    day.c += Number(f.carbs_g);
    day.f += Number(f.fat_g);
  }
  for (const w of workouts) {
    const day = byDay[w.performed_on];
    if (!day) continue;
    day.burned += w.calories_burned ?? 0;
  }
  const series = Object.values(byDay);

  const daysWithLogs = series.filter((d) => d.kcal > 0).length;
  const avgKcal = daysWithLogs ? series.reduce((s, d) => s + d.kcal, 0) / daysWithLogs : 0;
  const totalBurned = workouts.reduce((s, w) => s + (w.calories_burned ?? 0), 0);
  const target = profile?.daily_calorie_target ?? 2000;

  const weightDelta = weights.length > 1
    ? Number(weights[weights.length - 1]!.weight_kg) - Number(weights[0]!.weight_kg)
    : 0;

  if (foods.length === 0 && weights.length === 0 && workouts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <Card>
          <EmptyState
            icon={<BarChart3 className="w-5 h-5" />}
            title="No data yet"
            description="Log a few meals, weigh-ins, or workouts and check back in a day or two."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted">Last {RANGE_DAYS} days · through {new Date(todayISO()).toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat title="Avg daily kcal" value={daysWithLogs ? formatNumber(avgKcal) : "—"} sub={`Target ${formatNumber(target)}`} />
        <Stat title="Days logged" value={`${daysWithLogs}`} sub={`of ${RANGE_DAYS}`} />
        <Stat title="Workouts" value={`${workouts.length}`} sub={`${formatNumber(totalBurned)} kcal burned`} />
        <Stat title="Weight change"
          value={weights.length > 1 ? `${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(1)} kg` : "—"}
          sub={weights.length > 1 ? `${weights.length} entries` : "Need ≥ 2 entries"}
          tone={weightDelta < 0 ? "ok" : weightDelta > 0 ? "warn" : "muted"} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Calories</CardTitle>
            <CardSub>Eaten vs target · workouts net out below</CardSub>
          </div>
        </CardHeader>
        <CaloriesChart data={series} target={target} />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Macros</CardTitle>
            <CardSub>Daily totals — protein / carbs / fat (g)</CardSub>
          </div>
        </CardHeader>
        <MacrosChart data={series} />
      </Card>
    </div>
  );
}

function Stat({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone?: "ok" | "warn" | "muted" }) {
  const color = tone === "ok" ? "text-primary" : tone === "warn" ? "text-accent" : "text-text";
  return (
    <div className="card !p-4">
      <div className="text-xs text-muted">{title}</div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  );
}
