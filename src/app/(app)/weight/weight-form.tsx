"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertWeight } from "@/actions/weight";
import { toast } from "@/components/ui/toast";

export function WeightForm({
  defaultDate, latest,
}: { defaultDate: string; latest: number | null }) {
  const [weight, setWeight] = useState(latest ?? "");
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const w = Number(weight);
        if (!w || w <= 0) return toast.err("Enter a weight in kg");
        start(async () => {
          const res = await upsertWeight({ weight_kg: w, logged_on: date, note });
          if (!res.ok) toast.err(res.error ?? "Couldn't save");
          else { toast.ok("Saved"); setNote(""); }
        });
      }}
      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
    >
      <Input
        label="Weight (kg)"
        type="number" inputMode="decimal" step="0.1" min="0"
        placeholder="74.5"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
      />
      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <Button type="submit" loading={pending}>Save</Button>
      <Input
        className="sm:col-span-3"
        label="Note (optional)"
        placeholder="e.g. morning, after workout"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </form>
  );
}
