"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { workoutSchema, type WorkoutInput } from "@/lib/validations";

export async function addWorkout(input: WorkoutInput) {
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("workouts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    duration_min: parsed.data.duration_min,
    calories_burned: parsed.data.calories_burned ?? 0,
    notes: parsed.data.notes ?? null,
    performed_on: parsed.data.performed_on,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return { ok: true };
}

export async function deleteWorkout(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/workouts");
  revalidatePath("/analytics");
  return { ok: true };
}
