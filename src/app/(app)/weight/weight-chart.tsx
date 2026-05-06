"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export function WeightChart({ data }: { data: { date: string; kg: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1F2730" strokeDasharray="3 3" />
          <XAxis
            dataKey="date" stroke="#8A95A1" fontSize={11}
            tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          />
          <YAxis stroke="#8A95A1" fontSize={11} domain={["auto", "auto"]} unit=" kg" width={48} />
          <Tooltip
            contentStyle={{ background: "#11161A", border: "1px solid #1F2730", borderRadius: 12 }}
            labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
            formatter={(v) => [`${(v as number).toFixed(1)} kg`, "Weight"]}
          />
          <Line type="monotone" dataKey="kg" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
