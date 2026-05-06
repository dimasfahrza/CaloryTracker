"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { weightSchema, type WeightInput } from "@/lib/validations";

export async function upsertWeight(input: WeightInput) {
  const parsed = weightSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("weight_logs").upsert(
    {
      user_id: user.id,
      weight_kg: parsed.data.weight_kg,
      note: parsed.data.note ?? null,
      logged_on: parsed.data.logged_on,
    },
    { onConflict: "user_id,logged_on" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/weight");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return { ok: true };
}

export async function deleteWeight(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase.from("weight_logs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/weight");
  revalidatePath("/analytics");
  return { ok: true };
}
