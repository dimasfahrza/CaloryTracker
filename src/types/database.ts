// Hand-typed minimal database types. For production you can replace this with
// `supabase gen types typescript --project-id <id> > src/types/database.ts`.

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type Goal = "lose" | "maintain" | "gain";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type WorkoutType = "strength" | "cardio" | "hiit" | "yoga" | "sports" | "other";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  sex: "male" | "female" | "other" | null;
  birth_date: string | null;
  height_cm: number | null;
  activity_level: ActivityLevel;
  goal: Goal;
  daily_calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  created_at: string;
  updated_at: string;
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  food_id: string | null;
  food_name: string;
  meal: Meal;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_on: string;
  logged_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  note: string | null;
  logged_on: string;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  type: WorkoutType;
  duration_min: number;
  calories_burned: number | null;
  notes: string | null;
  performed_on: string;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise: string;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
  position: number;
}

export interface DailyTotals {
  user_id: string;
  logged_on: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  entries: number;
}
