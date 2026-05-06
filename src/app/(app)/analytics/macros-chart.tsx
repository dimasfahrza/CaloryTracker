"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

interface Datum { date: string; p: number; c: number; f: number }

export function MacrosChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1F2730" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#8A95A1" fontSize={10}
            tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
          <YAxis stroke="#8A95A1" fontSize={11} width={40} unit="g" />
          <Tooltip
            contentStyle={{ background: "#11161A", border: "1px solid #1F2730", borderRadius: 12 }}
            labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
            formatter={(v, n) => [`${Math.round(Number(v))} g`, n === "p" ? "Protein" : n === "c" ? "Carbs" : "Fat"]}
          />
          <Legend formatter={(v) => v === "p" ? "Protein" : v === "c" ? "Carbs" : "Fat"} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="p" stackId="a" fill="#60A5FA" />
          <Bar dataKey="c" stackId="a" fill="#F59E0B" />
          <Bar dataKey="f" stackId="a" fill="#F472B6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
