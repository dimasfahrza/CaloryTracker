import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardSub } from "@/components/ui/card";
import { EmptyState } from "@/components/widgets/empty-state";
import { Scale } from "lucide-react";
import { todayISO, formatNumber } from "@/lib/utils";
import type { WeightLog } from "@/types/database";
import { WeightForm } from "./weight-form";
import { WeightChart } from "./weight-chart";
import { WeightRow } from "./weight-row";

export const dynamic = "force-dynamic";

export default async function WeightPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", user!.id)
    .order("logged_on", { ascending: true })
    .limit(180);

  const logs = (data ?? []) as WeightLog[];
  const latest = logs[logs.length - 1];
  const earliest = logs[0];
  const delta = latest && earliest && latest.id !== earliest.id
    ? Number(latest.weight_kg) - Number(earliest.weight_kg) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Weight</h1>
        <p className="text-sm text-muted">Log once a day. Trend matters more than today&apos;s number.</p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Today&apos;s weigh-in</CardTitle>
            <CardSub>Latest: {latest ? `${formatNumber(Number(latest.weight_kg), 1)} kg on ${new Date(latest.logged_on).toLocaleDateString()}` : "no entries yet"}</CardSub>
          </div>
        </CardHeader>
        <WeightForm defaultDate={todayISO()} latest={latest ? Number(latest.weight_kg) : null} />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Trend</CardTitle>
            <CardSub>
              {logs.length > 1
                ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} kg over ${logs.length} entries`
                : "Add another entry to see your trend"}
            </CardSub>
          </div>
        </CardHeader>
        {logs.length === 0 ? (
          <EmptyState icon={<Scale className="w-5 h-5" />} title="No weight logged yet"
            description="Log your weight today to start tracking the trend." />
        ) : (
          <WeightChart data={logs.map((l) => ({ date: l.logged_on, kg: Number(l.weight_kg) }))} />
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        {logs.length === 0 ? (
          <p className="text-sm text-muted">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {[...logs].reverse().map((l) => <WeightRow key={l.id} log={l} />)}
          </ul>
        )}
      </Card>
    </div>
  );
}
