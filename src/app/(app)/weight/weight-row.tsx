"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { WeightLog } from "@/types/database";
import { deleteWeight } from "@/actions/weight";
import { toast } from "@/components/ui/toast";

export function WeightRow({ log }: { log: WeightLog }) {
  const [pending, start] = useTransition();
  return (
    <li className="py-3 flex items-center justify-between gap-3">
      <div>
        <div className="font-medium tabular-nums">{Number(log.weight_kg).toFixed(1)} kg</div>
        <div className="text-xs text-muted">
          {new Date(log.logged_on).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          {log.note ? ` · ${log.note}` : ""}
        </div>
      </div>
      <button
        onClick={() => start(async () => {
          const res = await deleteWeight(log.id);
          if (!res.ok) toast.err(res.error ?? "Couldn't delete");
          else toast.ok("Removed");
        })}
        disabled={pending}
        aria-label="Delete entry"
        className="text-muted hover:text-danger p-1.5 rounded-lg hover:bg-surface2"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}
