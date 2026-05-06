"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { Workout } from "@/types/database";
import { deleteWorkout } from "@/actions/workouts";
import { toast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/utils";

export function WorkoutRow({ workout }: { workout: Workout }) {
  const [pending, start] = useTransition();
  return (
    <li className="py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium truncate">{workout.name}</div>
        <div className="text-xs text-muted capitalize">
          {workout.type} · {workout.duration_min} min
          {workout.notes ? ` · ${workout.notes}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-sm tabular-nums">{formatNumber(workout.calories_burned ?? 0)} kcal</div>
        <button
          onClick={() => start(async () => {
            const res = await deleteWorkout(workout.id);
            if (!res.ok) toast.err(res.error ?? "Couldn't delete");
            else toast.ok("Removed");
          })}
          disabled={pending}
          aria-label="Delete workout"
          className="text-muted hover:text-danger p-1.5 rounded-lg hover:bg-surface2"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}
