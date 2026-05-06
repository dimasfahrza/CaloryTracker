"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { addWorkout } from "@/actions/workouts";
import { toast } from "@/components/ui/toast";
import type { WorkoutType } from "@/types/database";

const TYPES: WorkoutType[] = ["strength", "cardio", "hiit", "yoga", "sports", "other"];

export function WorkoutActions({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: "", type: "strength" as WorkoutType,
    duration_min: 30, calories_burned: 0,
    notes: "", performed_on: defaultDate,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Log workout</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Log a workout">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return toast.err("Name your workout");
            start(async () => {
              const res = await addWorkout(form);
              if (!res.ok) toast.err(res.error ?? "Couldn't save");
              else { toast.ok("Saved"); setOpen(false); }
            });
          }}
        >
          <Input label="Name" placeholder="Push day, 5k run, ..."
            value={form.name} onChange={(e) => set("name", e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type}
              onChange={(e) => set("type", e.target.value as WorkoutType)}>
              {TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </Select>
            <Input label="Date" type="date"
              value={form.performed_on} onChange={(e) => set("performed_on", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (min)" type="number" min="0"
              value={form.duration_min}
              onChange={(e) => set("duration_min", Number(e.target.value) || 0)} />
            <Input label="Calories burned" type="number" min="0"
              value={form.calories_burned}
              onChange={(e) => set("calories_burned", Number(e.target.value) || 0)} />
          </div>

          <Textarea label="Notes (optional)" placeholder="Sets, reps, how you felt…"
            value={form.notes} onChange={(e) => set("notes", e.target.value)} />

          <Button type="submit" block loading={pending}>Save workout</Button>
        </form>
      </Dialog>
    </>
  );
}
