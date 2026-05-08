"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Plus, Camera, Upload, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/widgets/empty-state";
import { Skeleton } from "@/components/widgets/skeleton";
import { addFoodLog, searchFoods, createCustomFood } from "@/actions/food";
import { toast } from "@/components/ui/toast";
import type { Food, Meal } from "@/types/database";
import { formatNumber } from "@/lib/utils";
import type { FoodAnalysis } from "@/app/api/analyze-food/route";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export function AddFoodDialog({
  open, onClose, defaultDate, defaultMeal = "breakfast",
}: { open: boolean; onClose: () => void; defaultDate: string; defaultMeal?: Meal }) {
  const [tab, setTab] = useState<"search" | "custom" | "photo">("search");
  return (
    <Dialog open={open} onClose={onClose} title="Add food" description="Search, enter custom values, or scan a photo.">
      <div className="flex gap-1 p-1 mb-4 bg-surface2 rounded-xl text-sm">
        {(["search", "custom", "photo"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg capitalize transition ${
              tab === t ? "bg-surface text-text shadow-card" : "text-muted hover:text-text"
            }`}
          >
            {t === "photo" ? "📷 Photo" : t}
          </button>
        ))}
      </div>
      {tab === "search" && <SearchTab onClose={onClose} defaultDate={defaultDate} defaultMeal={defaultMeal} />}
      {tab === "custom" && <CustomTab onClose={onClose} defaultDate={defaultDate} defaultMeal={defaultMeal} />}
      {tab === "photo" && <PhotoTab onClose={onClose} defaultDate={defaultDate} defaultMeal={defaultMeal} />}
    </Dialog>
  );
}

/* ─── Search Tab ─────────────────────────────────────────────────────────── */

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

/* ─── Custom Tab ─────────────────────────────────────────────────────────── */

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

/* ─── Photo Tab ──────────────────────────────────────────────────────────── */

function PhotoTab({
  onClose, defaultDate, defaultMeal,
}: { onClose: () => void; defaultDate: string; defaultMeal: Meal }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [pending, start] = useTransition();

  const pickFile = (file: File) => {
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setName("");
  };

  const reset = () => {
    setImageFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setName("");
    setServings(1);
  };

  // Auto-analyze whenever a new image is picked
  useEffect(() => {
    if (!imageFile) return;
    let cancelled = false;
    setAnalyzing(true);
    (async () => {
      try {
        const fd = new FormData();
        fd.append("image", imageFile);
        const res = await fetch("/api/analyze-food", { method: "POST", body: fd });
        const data = await res.json() as FoodAnalysis & { error?: string };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Analysis failed");
        setResult(data);
        setName(data.food_name);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [imageFile]);

  /* ── No image selected yet ── */
  if (!imageFile) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted text-center leading-relaxed">
          Take a photo or upload an image of your food.<br />
          AI will detect the food and estimate calories automatically.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-surface2 transition-colors"
          >
            <Camera className="w-8 h-8 text-primary" />
            <span className="text-sm font-medium">Take Photo</span>
          </button>
          <button
            onClick={() => uploadRef.current?.click()}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-surface2 transition-colors"
          >
            <Upload className="w-8 h-8 text-muted" />
            <span className="text-sm font-medium">Upload Image</span>
          </button>
        </div>

        <p className="text-xs text-muted text-center">Supports JPG, PNG, WEBP · max 10 MB</p>

        <input
          ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
        />
        <input
          ref={uploadRef} type="file" accept="image/*" className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
        />
      </div>
    );
  }

  /* ── Image selected: preview + analysis ── */
  return (
    <div className="space-y-4">
      {/* Preview with remove button */}
      <div className="relative rounded-xl overflow-hidden bg-surface2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview!} alt="Food preview" className="w-full h-44 object-cover" />
        <button
          onClick={reset}
          aria-label="Remove image"
          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {analyzing && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <div
              className="w-8 h-8 border-primary border-t-transparent rounded-full animate-spin"
              style={{ borderWidth: 3, borderStyle: "solid" }}
            />
            <span className="text-white text-sm font-medium">Analyzing food…</span>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && !analyzing && (
        <div className="text-danger text-sm p-3 bg-danger/10 rounded-xl border border-danger/20">
          {error}
          <button onClick={reset} className="block mt-2 text-xs underline">Try another image</button>
        </div>
      )}

      {/* Results */}
      {result && !analyzing && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              result.confidence === "high"   ? "bg-primary/20 text-primary" :
              result.confidence === "medium" ? "bg-accent/20 text-accent" :
                                              "bg-border text-muted"
            }`}>
              {result.confidence} confidence
            </span>
            <span className="text-xs text-muted">{result.portion_description}</span>
          </div>

          <Input
            label="Food name (edit if needed)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="kcal" value={formatNumber(Math.round(result.calories * servings))} />
            <Stat label="P"    value={formatNumber(+(result.protein_g * servings).toFixed(1))} />
            <Stat label="C"    value={formatNumber(+(result.carbs_g   * servings).toFixed(1))} />
            <Stat label="F"    value={formatNumber(+(result.fat_g     * servings).toFixed(1))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Servings"
              type="number" inputMode="decimal" step="0.25" min="0.25"
              value={servings}
              onChange={(e) => setServings(Math.max(0.25, Number(e.target.value) || 1))}
            />
            <Select label="Meal" value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
              {MEALS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
            </Select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={reset}>Retake</Button>
            <Button block loading={pending} onClick={() => start(async () => {
              if (!name.trim()) return toast.err("Food name is required");
              const factor = servings || 1;
              const res = await addFoodLog({
                food_id: null,
                food_name: name.trim(),
                meal,
                servings: factor,
                calories: Math.round(result.calories * factor),
                protein_g: +(result.protein_g * factor).toFixed(1),
                carbs_g:   +(result.carbs_g   * factor).toFixed(1),
                fat_g:     +(result.fat_g     * factor).toFixed(1),
                logged_on: defaultDate,
              });
              if (!res.ok) toast.err(res.error ?? "Couldn't save");
              else { toast.ok("Logged!"); onClose(); }
            })}>
              <Plus className="w-4 h-4" /> Add to log
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Shared ─────────────────────────────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface2 py-2">
      <div className="text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
