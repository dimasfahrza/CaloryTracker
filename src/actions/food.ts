"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { foodLogSchema, type FoodLogInput } from "@/lib/validations";

async function uid() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addFoodLog(input: FoodLogInput) {
  const parsed = foodLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const { supabase, userId } = await uid();
  const { error } = await supabase.from("food_logs").insert({
    user_id: userId,
    food_id: parsed.data.food_id ?? null,
    food_name: parsed.data.food_name,
    meal: parsed.data.meal,
    servings: parsed.data.servings,
    calories: parsed.data.calories,
    protein_g: parsed.data.protein_g,
    carbs_g: parsed.data.carbs_g,
    fat_g: parsed.data.fat_g,
    logged_on: parsed.data.logged_on,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/food");
  revalidatePath("/analytics");
  return { ok: true };
}

export async function deleteFoodLog(id: string) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from("food_logs").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/food");
  revalidatePath("/analytics");
  return { ok: true };
}

export async function searchFoods(query: string) {
  const { supabase } = await uid();
  const q = query.trim();
  if (!q) {
    const { data, error } = await supabase
      .from("foods").select("*").order("name").limit(20);
    return error ? { ok: false, error: error.message, data: [] } : { ok: true, data: data ?? [] };
  }
  const { data, error } = await supabase
    .from("foods").select("*").ilike("name", `%${q}%`).order("name").limit(20);
  return error ? { ok: false, error: error.message, data: [] } : { ok: true, data: data ?? [] };
}

export async function createCustomFood(input: {
  name: string; serving_size_g: number; calories: number;
  protein_g: number; carbs_g: number; fat_g: number;
}) {
  const { supabase, userId } = await uid();
  const { data, error } = await supabase
    .from("foods")
    .insert({ ...input, brand: null, created_by: userId, is_public: false })
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}
