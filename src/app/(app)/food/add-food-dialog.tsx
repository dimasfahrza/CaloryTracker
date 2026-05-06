"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/widgets/empty-state";
import { Skeleton } from "@/components/widgets/skeleton";
import { addFoodLog, searchFoods, createCustomFood } from "@/actions/food";
import { toast } from "@/components/ui/toast";
import type { Food, Meal } from "@/types/database";
import { formatNumber } from "@/lib/utils";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export function AddFoodDialog({
  open, onClose, defaultDate, defaultMeal = "breakfast",
}: { open: boolean; onClose: () => void; defaultDate: string; defaultMeal?: Meal }) {
  const [tab, setTab] = useState<"search" | "custom">("search");
  return (
    <Dialog open={open} onClose={onClose} title="Add food" description="Search the catalog or enter custom values.">
      <div className="flex gap-1 p-1 mb-4 bg-surface2 rounded-xl text-sm">
        {(["search", "custom"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg capitalize transition ${
              tab === t ? "bg-surface text-text shadow-card" : "text-muted hover:text-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "search"
        ? <SearchTab onClose={onClose} defaultDate={defaultDate} defaultMeal={defaultMeal} />
        : <CustomTab onClose={onClose} defaultDate={defaultDate} defaultMeal={defaultMeal} />}
    </Dialog>
  );
}

function SearchTab({
  onClose, defaultDate, defaultMeal,
}: { onClose: () => void; defaultDate: string; defaultMeal: Meal }) {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Food | null>(null);
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [pending, start] = useTransition();

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchFoods(query);
      if (active) {
        setFoods(res.data ?? []);
        setLoading(false);
      }
    }, 200);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  if (picked) {
    const factor = servings || 0;
    const cal = picked.calories * factor;
    return (
      <div className="space-y-4">
        <div className="card !p-4">
          <div className="font-medium">{picked.name}</div>
          <div className="text-xs text-muted mt-0.5">
            {picked.serving_size_g} g serving · {formatNumber(picked.calories)} kcal each
          </div>
        </div>

        <Input
          type="number" inputMode="decimal" step="0.25" min="0.25"
          label="Servings"
          value={servings}
          onChange={(e) => setServings(Math.max(0, Number(e.target.value) || 0))}
        />

        <Select label="Meal" value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
          {MEALS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
        </Select>

        <div className="grid grid-cols-4 gap-3 text-center">
          <Stat label="kcal" value={formatNumber(cal)} />
          <Stat label="P" value={formatNumber(picked.protein_g * factor)} />
          <Stat label="C" value={formatNumber(picked.carbs_g * factor)} />
          <Stat label="F" value={formatNumber(picked.fat_g * factor)} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" block onClick={() => setPicked(null)}>Back</Button>
          <Button block loading={pending} onClick={() => start(async () => {
            const res = await addFoodLog({
              food_id: picked.id,
              food_name: picked.name,
              meal,
              servings,
              calories: Math.round(picked.calories * factor),
              protein_g: +(picked.protein_g * factor).toFixed(1),
              carbs_g: +(picked.carbs_g * factor).toFixed(1),
              fat_g: +(picked.fat_g * factor).toFixed(1),
              logged_on: defaultDate,
            });
            if (!res.ok) toast.err(res.error ?? "Couldn't save");
            else { toast.ok("Logged"); onClose(); }
          })}>Add</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          placeholder="Search foods…"
          className="input pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="max-h-72 overflow-y-auto -mx-1">
        {loading ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : foods.length === 0 ? (
          <EmptyState title="No matches" description="Try a different search or add a custom food." />
        ) : (
          <ul className="divide-y divide-border">
            {foods.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => setPicked(f)}
                  className="w-full text-left py-3 px-1 flex items-center justify-between hover:bg-surface2 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted">{f.serving_size_g}g · {formatNumber(f.protein_g)}P / {formatNumber(f.carbs_g)}C / {formatNumber(f.fat_g)}F</div>
                  </div>
                  <div className="text-sm tabular-nums text-muted">{formatNumber(f.calories)} kcal</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CustomTab({
  onClose, defaultDate, defaultMeal,
}: { onClose: () => void; defaultDate: string; defaultMeal: Meal }) {
  const [form, setForm] = useState({
    name: "", serving_size_g: 100,
    calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
    servings: 1,
    meal: defaultMeal as Meal,
    saveToCatalog: true,
  });
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.err("Give it a name");
        start(async () => {
          let foodId: string | null = null;
          if (form.saveToCatalog) {
            const c = await createCustomFood({
              name: form.name.trim(),
              serving_size_g: form.serving_size_g,
              calories: form.calories,
              protein_g: form.protein_g,
              carbs_g: form.carbs_g,
              fat_g: form.fat_g,
            });
            if (!c.ok) return toast.err(c.error);
            foodId = c.data.id;
          }
          const factor = form.servings || 1;
          const res = await addFoodLog({
            food_id: foodId,
            food_name: form.name.trim(),
            meal: form.meal,
            servings: form.servings,
            calories: Math.round(form.calories * factor),
            protein_g: +(form.protein_g * factor).toFixed(1),
            carbs_g: +(form.carbs_g * factor).toFixed(1),
            fat_g: +(form.fat_g * factor).toFixed(1),
            logged_on: defaultDate,
          });
          if (!res.ok) toast.err(res.error ?? "Couldn't save");
          else { toast.ok("Logged"); onClose(); }
        });
      }}
    >
      <Input label="Name" placeholder="Mom's chicken curry"
        value={form.name} onChange={(e) => set("name", e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Serving (g)" type="number" inputMode="decimal" step="1" min="1"
          value={form.serving_size_g} onChange={(e) => set("serving_size_g", Number(e.target.value) || 0)} />
        <Input label="Servings" type="number" inputMode="decimal" step="0.25" min="0.25"
          value={form.servings} onChange={(e) => set("servings", Number(e.target.value) || 0)} />
      </div>

      <Input label="Calories (per serving)" type="number" inputMode="decimal" min="0"
        value={form.calories} onChange={(e) => set("calories", Number(e.target.value) || 0)} />

      <div className="grid grid-cols-3 gap-3">
        <Input label="Protein g" type="number" inputMode="decimal" min="0"
          value={form.protein_g} onChange={(e) => set("protein_g", Number(e.target.value) || 0)} />
        <Input label="Carbs g" type="number" inputMode="decimal" min="0"
          value={form.carbs_g} onChange={(e) => set("carbs_g", Number(e.target.value) || 0)} />
        <Input label="Fat g" type="number" inputMode="decimal" min="0"
          value={form.fat_g} onChange={(e) => set("fat_g", Number(e.target.value) || 0)} />
      </div>

      <Select label="Meal" value={form.meal} onChange={(e) => set("meal", e.target.value as Meal)}>
        {MEALS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
      </Select>

      <label className="flex items-center gap-2 text-sm text-muted pt-1">
        <input type="checkbox" checked={form.saveToCatalog}
          onChange={(e) => set("saveToCatalog", e.target.checked)}
          className="accent-primary" />
        Save to my foods so I can reuse it
      </label>

      <Button type="submit" block loading={pending}><Plus className="w-4 h-4" /> Add to log</Button>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface2 py-2">
      <div className="text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
