import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/widgets/empty-state";
import { UtensilsCrossed } from "lucide-react";
import { todayISO, formatNumber } from "@/lib/utils";
import type { FoodLog, Meal, Profile } from "@/types/database";
import { FoodActions } from "./food-actions";
import { LogRow } from "./log-row";

export const dynamic = "force-dynamic";

const MEAL_ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export default async function FoodPage({ searchParams }: { searchParams: { date?: string } }) {
  const date = (searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date))
    ? searchParams.date : todayISO();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [logsRes, profileRes] = await Promise.all([
    supabase.from("food_logs").select("*").eq("logged_on", date).eq("user_id", user!.id).order("logged_at"),
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
  ]);

  const logs = (logsRes.data ?? []) as FoodLog[];
  const profile = profileRes.data as Profile | null;
  const target = profile?.daily_calorie_target ?? 2000;

  const grouped: Record<Meal, FoodLog[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  let totalCal = 0;
  for (const log of logs) {
    grouped[log.meal as Meal].push(log);
    totalCal += Number(log.calories);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Food log</h1>
          <p className="text-sm text-muted">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <FoodActions defaultDate={date} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Day total</CardTitle>
          <span className="text-sm text-muted tabular-nums">
            {formatNumber(totalCal)} / {formatNumber(target)} kcal
          </span>
        </CardHeader>
        <div className="h-2 rounded-full bg-surface2 overflow-hidden">
          <div className="h-full bg-primary rounded-full"
            style={{ width: `${Math.min(100, (totalCal / Math.max(target, 1)) * 100)}%` }} />
        </div>
      </Card>

      {MEAL_ORDER.map((meal) => {
        const items = grouped[meal];
        const cal = items.reduce((s, l) => s + Number(l.calories), 0);
        return (
          <Card key={meal}>
            <CardHeader>
              <div>
                <CardTitle className="capitalize">{meal}</CardTitle>
                <p className="text-xs text-muted">{items.length} item{items.length === 1 ? "" : "s"} · {formatNumber(cal)} kcal</p>
              </div>
              <FoodActions defaultDate={date} defaultMeal={meal} compact />
            </CardHeader>
            {items.length === 0 ? (
              <EmptyState
                icon={<UtensilsCrossed className="w-5 h-5" />}
                title={`No ${meal} logged`}
                description={`Add what you ate for ${meal}.`}
              />
            ) : (
              <ul className="divide-y divide-border">
                {items.map((l) => <LogRow key={l.id} log={l} />)}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
