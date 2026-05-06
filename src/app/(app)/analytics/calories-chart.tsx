"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Datum { date: string; kcal: number; burned: number }

export function CaloriesChart({ data, target }: { data: Datum[]; target: number }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1F2730" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#8A95A1" fontSize={10}
            tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
          <YAxis stroke="#8A95A1" fontSize={11} width={40} />
          <Tooltip
            contentStyle={{ background: "#11161A", border: "1px solid #1F2730", borderRadius: 12 }}
            labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
            formatter={(v, n) => [Math.round(Number(v)), n === "kcal" ? "Eaten" : "Burned"]}
          />
          <ReferenceLine y={target} stroke="#22C55E" strokeDasharray="4 4" />
          <Bar dataKey="kcal" fill="#22C55E" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="burned" stroke="#F59E0B" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
