export interface ChatTextEvent { type: "text"; delta: string }
export interface ChatToolEvent {
  type: "tool";
  id: string;
  name: string;
  input: unknown;
  result: ChatToolResult;
}
export interface ChatDoneEvent { type: "done" }
export interface ChatErrorEvent { type: "error"; message: string }
export type ChatEvent = ChatTextEvent | ChatToolEvent | ChatDoneEvent | ChatErrorEvent;

export type ChatToolResult =
  | { kind: "search"; count: number }
  | {
      kind: "food";
      id: string;
      food_name: string;
      meal: "breakfast" | "lunch" | "dinner" | "snack";
      servings: number;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      logged_on: string;
    }
  | {
      kind: "workout";
      id: string;
      name: string;
      type: string;
      duration_min: number;
      calories_burned: number;
      performed_on: string;
    }
  | {
      kind: "weight";
      id: string;
      weight_kg: number;
      logged_on: string;
    }
  | {
      kind: "summary";
      target: number;
      eaten: number;
      burned: number;
      remaining: number;
    }
  | { kind: "error"; message?: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: ChatToolEvent[];
  pending?: boolean;
  error?: string;
  undone?: Record<string, true>;
}
