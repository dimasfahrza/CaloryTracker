"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function undoChatAction(kind: "food" | "workout" | "weight", id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const table = kind === "food" ? "food_logs" : kind === "workout" ? "workouts" : "weight_logs";
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/food");
  revalidatePath("/weight");
  revalidatePath("/workouts");
  revalidatePath("/analytics");
  return { ok: true };
}
