"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { FoodLog } from "@/types/database";
import { deleteFoodLog } from "@/actions/food";
import { formatNumber } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

export function LogRow({ log }: { log: FoodLog }) {
  const [pending, start] = useTransition();
  return (
    <li className="py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium truncate">{log.food_name}</div>
        <div className="text-xs text-muted">
          {Number(log.servings)}× · {formatNumber(Number(log.protein_g))}P / {formatNumber(Number(log.carbs_g))}C / {formatNumber(Number(log.fat_g))}F
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-sm tabular-nums">{formatNumber(Number(log.calories))} kcal</div>
        <button
          onClick={() => start(async () => {
            const res = await deleteFoodLog(log.id);
            if (!res.ok) toast.err(res.error ?? "Couldn't delete");
            else toast.ok("Removed");
          })}
          disabled={pending}
          aria-label="Delete entry"
          className="text-muted hover:text-danger p-1.5 rounded-lg hover:bg-surface2"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}
