import { clamp, formatNumber } from "@/lib/utils";

interface Props {
  label: string;
  current: number;
  target: number;
  color: "protein" | "carbs" | "fat";
  unit?: string;
}

const COLOR_BG: Record<Props["color"], string> = {
  protein: "bg-protein",
  carbs: "bg-carbs",
  fat: "bg-fat",
};

export function MacroBar({ label, current, target, color, unit = "g" }: Props) {
  const pct = target > 0 ? clamp(current / target, 0, 1) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          <span className="text-text">{formatNumber(current)}</span>
          <span className="text-muted"> / {formatNumber(target)} {unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface2 overflow-hidden">
        <div
          className={`${COLOR_BG[color]} h-full rounded-full`}
          style={{ width: `${pct}%`, transition: "width 500ms ease" }}
        />
      </div>
    </div>
  );
}
