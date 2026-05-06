import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/widgets/empty-state";
import { Dumbbell } from "lucide-react";
import { todayISO, formatNumber } from "@/lib/utils";
import type { Workout } from "@/types/database";
import { WorkoutActions } from "./workout-actions";
import { WorkoutRow } from "./workout-row";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user!.id)
    .order("performed_on", { ascending: false })
    .limit(60);

  const workouts = (data ?? []) as Workout[];
  const grouped: Record<string, Workout[]> = {};
  for (const w of workouts) (grouped[w.performed_on] ??= []).push(w);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Workouts</h1>
          <p className="text-sm text-muted">Log what you trained, how long, and the calories burned.</p>
        </div>
        <WorkoutActions defaultDate={todayISO()} />
      </div>

      {workouts.length === 0 ? (
        <Card>
          <EmptyState icon={<Dumbbell className="w-5 h-5" />} title="No workouts yet"
            description="Log a workout to track volume and balance against your calories." />
        </Card>
      ) : (
        dates.map((date) => {
          const items = grouped[date]!;
          const cal = items.reduce((s, w) => s + (w.calories_burned ?? 0), 0);
          const min = items.reduce((s, w) => s + (w.duration_min ?? 0), 0);
          return (
            <Card key={date}>
              <CardHeader>
                <div>
                  <CardTitle>{new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "long", month: "long", day: "numeric",
                  })}</CardTitle>
                  <p className="text-xs text-muted">{items.length} session · {min} min · {formatNumber(cal)} kcal</p>
                </div>
              </CardHeader>
              <ul className="divide-y divide-border">
                {items.map((w) => <WorkoutRow key={w.id} workout={w} />)}
              </ul>
            </Card>
          );
        })
      )}
    </div>
  );
}
