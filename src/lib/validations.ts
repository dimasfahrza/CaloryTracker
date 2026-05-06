import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email");
export const passwordSchema = z.string().min(8, "Min 8 characters").max(72, "Max 72 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Required"),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Tell us your name").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const foodLogSchema = z.object({
  food_id: z.string().uuid().optional().nullable(),
  food_name: z.string().trim().min(1, "Name required").max(120),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  servings: z.coerce.number().positive().max(50),
  calories: z.coerce.number().nonnegative().max(10_000),
  protein_g: z.coerce.number().nonnegative().max(1_000).default(0),
  carbs_g: z.coerce.number().nonnegative().max(1_000).default(0),
  fat_g: z.coerce.number().nonnegative().max(1_000).default(0),
  logged_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type FoodLogInput = z.infer<typeof foodLogSchema>;

export const weightSchema = z.object({
  weight_kg: z.coerce.number().positive("Weight must be > 0").max(500),
  note: z.string().trim().max(280).optional().nullable(),
  logged_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type WeightInput = z.infer<typeof weightSchema>;

export const workoutSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["strength", "cardio", "hiit", "yoga", "sports", "other"]),
  duration_min: z.coerce.number().int().min(0).max(600),
  calories_burned: z.coerce.number().int().min(0).max(5_000).optional().default(0),
  notes: z.string().trim().max(500).optional().nullable(),
  performed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type WorkoutInput = z.infer<typeof workoutSchema>;

export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  sex: z.enum(["male", "female", "other"]),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  height_cm: z.coerce.number().positive().max(260).optional().nullable(),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["lose", "maintain", "gain"]),
  daily_calorie_target: z.coerce.number().int().min(800).max(8_000),
  protein_target_g: z.coerce.number().int().min(0).max(500),
  carbs_target_g: z.coerce.number().int().min(0).max(800),
  fat_target_g: z.coerce.number().int().min(0).max(400),
});
export type ProfileInput = z.infer<typeof profileSchema>;
