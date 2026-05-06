import { clamp } from "@/lib/utils";

interface Props {
  consumed: number;
  target: number;
  burned?: number;
  size?: number;
  stroke?: number;
}

export function CalorieRing({ consumed, target, burned = 0, size = 200, stroke = 14 }: Props) {
  const remaining = Math.max(0, Math.round(target - consumed + burned));
  const pct = target > 0 ? clamp(consumed / target, 0, 1.25) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = pct * c;
  const over = consumed > target;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="rgb(31 39 48)"
          strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={over ? "rgb(239 68 68)" : "rgb(34 197 94)"}
          strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-semibold tabular-nums">{remaining}</div>
        <div className="text-xs text-muted mt-1">kcal left</div>
        {over && <div className="text-[11px] text-danger mt-1">over by {Math.round(consumed - target)}</div>}
      </div>
    </div>
  );
}
