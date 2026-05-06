"use client";

import { useState, useTransition } from "react";
import {
  UtensilsCrossed, Dumbbell, Scale, Search, Flame, AlertCircle, Undo2, Check,
} from "lucide-react";
import { undoChatAction } from "@/actions/chat";
import { toast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/utils";
import type { ChatToolEvent, ChatToolResult } from "./types";

export function ToolCard({
  event, undone, onUndone,
}: { event: ChatToolEvent; undone?: boolean; onUndone: (toolId: string) => void }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(undone ?? false);
  const r = event.result;

  const undoable: { kind: "food" | "workout" | "weight"; id: string } | null =
    r.kind === "food" ? { kind: "food", id: r.id }
    : r.kind === "workout" ? { kind: "workout", id: r.id }
    : r.kind === "weight" ? { kind: "weight", id: r.id }
    : null;

  function handleUndo() {
    if (!undoable) return;
    start(async () => {
      const res = await undoChatAction(undoable.kind, undoable.id);
      if (!res.ok) toast.err(res.error ?? "Couldn't undo");
      else { toast.ok("Undone"); setDone(true); onUndone(event.id); }
    });
  }

  return (
    <div className={`mt-2 rounded-xl border p-3 text-xs flex items-start gap-3 ${
      done ? "border-border bg-surface2/50 text-muted line-through" : "border-primary/30 bg-primary/5"
    }`}>
      <Icon r={r} />
      <div className="flex-1 min-w-0">
        <Body r={r} />
      </div>
      {undoable && !done && (
        <button
          onClick={handleUndo}
          disabled={pending}
          className="text-muted hover:text-text flex items-center gap-1 px-2 py-1 -my-1 rounded-md hover:bg-surface2 flex-shrink-0"
          aria-label="Undo this entry"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
      )}
      {done && <Check className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />}
    </div>
  );
}

function Icon({ r }: { r: ChatToolResult }) {
  const cls = "w-4 h-4 mt-0.5 flex-shrink-0 text-primary";
  if (r.kind === "food") return <UtensilsCrossed className={cls} />;
  if (r.kind === "workout") return <Dumbbell className={cls} />;
  if (r.kind === "weight") return <Scale className={cls} />;
  if (r.kind === "search") return <Search className={cls} />;
  if (r.kind === "summary") return <Flame className={cls} />;
  return <AlertCircle className={cls + " text-danger"} />;
}

function Body({ r }: { r: ChatToolResult }) {
  switch (r.kind) {
    case "food":
      return (
        <>
          <div className="font-medium text-text">{r.food_name}</div>
          <div className="text-muted">
            {r.meal} · {r.servings}× · <span className="text-text">{formatNumber(r.calories)} kcal</span> · {formatNumber(r.protein_g)}P / {formatNumber(r.carbs_g)}C / {formatNumber(r.fat_g)}F
          </div>
        </>
      );
    case "workout":
      return (
        <>
          <div className="font-medium text-text">{r.name}</div>
          <div className="text-muted capitalize">{r.type} · {r.duration_min} min · {formatNumber(r.calories_burned)} kcal burned</div>
        </>
      );
    case "weight":
      return <div className="font-medium text-text">{r.weight_kg.toFixed(1)} kg <span className="font-normal text-muted">on {r.logged_on}</span></div>;
    case "search":
      return <div className="text-muted">Searched catalog · {r.count} {r.count === 1 ? "match" : "matches"}</div>;
    case "summary":
      return (
        <div className="text-muted">
          <span className="text-text">{formatNumber(r.remaining)} kcal left</span> · {formatNumber(r.eaten)} eaten / {formatNumber(r.target)} target · {formatNumber(r.burned)} burned
        </div>
      );
    case "error":
      return <div className="text-danger">{r.message ?? "Tool failed"}</div>;
  }
}
