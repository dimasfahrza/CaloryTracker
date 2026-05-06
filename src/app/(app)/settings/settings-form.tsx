"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { updateProfile } from "@/actions/profile";
import { toast } from "@/components/ui/toast";
import { estimateBMR, estimateTDEE } from "@/lib/utils";
import type { Profile } from "@/types/database";

const ACTIVITIES = [
  ["sedentary", "Sedentary (little/no exercise)"],
  ["light", "Light (1–3 days/wk)"],
  ["moderate", "Moderate (3–5 days/wk)"],
  ["active", "Active (6–7 days/wk)"],
  ["very_active", "Very active (athlete)"],
] as const;

const GOALS = [
  ["lose", "Lose weight (-15% kcal)"],
  ["maintain", "Maintain"],
  ["gain", "Gain weight (+15% kcal)"],
] as const;

const SEXES = [["male", "Male"], ["female", "Female"], ["other", "Other / Prefer not to say"]] as const;

export function SettingsForm({ profile }: { profile: Profile }) {
  const [pending, start] = useTransition();
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<ProfileInput>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
        full_name: profile.full_name ?? "",
        sex: (profile.sex as "male" | "female" | "other") ?? "other",
        birth_date: profile.birth_date ?? "",
        height_cm: profile.height_cm ?? null,
        activity_level: profile.activity_level,
        goal: profile.goal,
        daily_calorie_target: profile.daily_calorie_target,
        protein_target_g: profile.protein_target_g,
        carbs_target_g: profile.carbs_target_g,
        fat_target_g: profile.fat_target_g,
      },
    });
  const [estimateNote, setEstimateNote] = useState<string | null>(null);

  const onSubmit = handleSubmit((values) =>
    start(async () => {
      const res = await updateProfile(values);
      if (!res.ok) toast.err(res.error ?? "Couldn't save");
      else toast.ok("Profile saved");
    }),
  );

  function suggest() {
    const sex = watch("sex");
    const dob = watch("birth_date");
    const height = Number(watch("height_cm"));
    const activity = watch("activity_level");
    const goal = watch("goal");

    if (!height || !dob) {
      setEstimateNote("Add height and birth date so we can estimate.");
      return;
    }
    const age = Math.max(13, Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86_400_000)));
    // Use latest weight if you have one, else fall back to a sane default of 70kg.
    const weightKg = 70;
    const bmr = estimateBMR({ sex, weightKg, heightCm: height, age });
    const tdee = estimateTDEE(bmr, activity);
    const adjust = goal === "lose" ? 0.85 : goal === "gain" ? 1.15 : 1;
    const target = Math.round((tdee * adjust) / 10) * 10;
    const protein = Math.round((target * 0.30) / 4 / 5) * 5;
    const fat = Math.round((target * 0.25) / 9 / 5) * 5;
    const carbs = Math.round((target * 0.45) / 4 / 5) * 5;

    setValue("daily_calorie_target", target, { shouldDirty: true });
    setValue("protein_target_g", protein, { shouldDirty: true });
    setValue("carbs_target_g", carbs, { shouldDirty: true });
    setValue("fat_target_g", fat, { shouldDirty: true });
    setEstimateNote(`Suggested ${target} kcal · 30P / 45C / 25F. Adjust if it doesn't feel right.`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Full name" error={errors.full_name?.message} {...register("full_name")} />
        <Select label="Sex" error={errors.sex?.message} {...register("sex")}>
          {SEXES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input type="date" label="Birth date" {...register("birth_date")} />
        <Input type="number" inputMode="decimal" step="0.1" min="0" label="Height (cm)"
          {...register("height_cm")} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Activity level" error={errors.activity_level?.message} {...register("activity_level")}>
          {ACTIVITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select label="Goal" error={errors.goal?.message} {...register("goal")}>
          {GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      <div className="flex items-center justify-between mt-2">
        <h4 className="text-sm font-medium">Daily targets</h4>
        <Button type="button" variant="ghost" size="sm" onClick={suggest}>Suggest from profile</Button>
      </div>
      {estimateNote && <p className="text-xs text-muted -mt-2">{estimateNote}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Input type="number" min="0" label="Calories"
          error={errors.daily_calorie_target?.message} {...register("daily_calorie_target")} />
        <Input type="number" min="0" label="Protein g"
          error={errors.protein_target_g?.message} {...register("protein_target_g")} />
        <Input type="number" min="0" label="Carbs g"
          error={errors.carbs_target_g?.message} {...register("carbs_target_g")} />
        <Input type="number" min="0" label="Fat g"
          error={errors.fat_target_g?.message} {...register("fat_target_g")} />
      </div>

      <div className="pt-2">
        <Button type="submit" loading={pending}>Save changes</Button>
      </div>
    </form>
  );
}
