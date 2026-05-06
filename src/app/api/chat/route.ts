import { GoogleGenAI, type Content, type FunctionDeclaration, type Part } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import {
  foodLogSchema, weightSchema, workoutSchema,
} from "@/lib/validations";
import type {
  Profile, FoodLog, WeightLog, Workout, Food,
} from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash";
const MAX_TURNS = 6;

const SYSTEM_PROMPT = `You are CaloryTracker's logging assistant.

Your job: read messages like "I had 2 eggs and toast for breakfast" or "ran 5k in 28 min" and use your tools to write the entries to the database.

Rules:
- Use your tools — actually log entries, don't describe what you would log.
- For food: when the user names a common item, call \`search_foods\` first. If a match exists, use those macros. Otherwise estimate macros and call \`log_food\` directly — say "estimated" in your reply.
- Multiple items in one message → multiple tool calls in the same turn (parallel is fine).
- Workouts: estimate calories burned if not stated (rough guides: walking 4 kcal/min, running 10, lifting 6, cycling 8, HIIT 12).
- Weigh-ins: use \`log_weight\`.
- "How many calories left?" / "what's my total?" → call \`get_today_summary\`, then answer in one short sentence.
- After logging, confirm in <= 2 short sentences. The UI shows the entries — don't restate every macro.
- Don't invent data the user didn't give. If something is genuinely ambiguous (e.g. "had a bowl of cereal" with no portion), ask one specific question rather than guessing.
- Default meal: infer from the time of day if the user didn't say one (5-10 = breakfast, 11-14 = lunch, 17-21 = dinner, else snack). Today's date is in the user message.
`;

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_foods",
    description: "Search the food catalog by name. Use BEFORE log_food for any common food the user names. Returns up to 10 matches with macros per serving. Empty array means no match — fall back to log_food with estimated macros.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Food name to search, e.g. 'banana' or 'chicken'" },
      },
      required: ["query"],
    },
  },
  {
    name: "log_food",
    description: "Insert a food entry into today's (or a specified date's) log. All macro fields are PER ENTRY (already multiplied by servings).",
    parameters: {
      type: "object",
      properties: {
        food_id: { type: "string", nullable: true, description: "UUID from search_foods if you matched one; null otherwise." },
        food_name: { type: "string", description: "Display name, e.g. 'Banana' or 'Mom's chicken curry'." },
        meal: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
        servings: { type: "number", description: "Number of servings, between 0.1 and 50." },
        calories: { type: "number", description: "Total kcal for this entry (servings already applied)." },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
        logged_on: { type: "string", description: "YYYY-MM-DD. Use today's date unless the user named a different day." },
      },
      required: ["food_name", "meal", "servings", "calories", "protein_g", "carbs_g", "fat_g", "logged_on"],
    },
  },
  {
    name: "log_workout",
    description: "Insert a workout into today's (or a specified date's) log.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: { type: "string", enum: ["strength", "cardio", "hiit", "yoga", "sports", "other"] },
        duration_min: { type: "integer", description: "Minutes, 0-600." },
        calories_burned: { type: "integer", description: "Estimated kcal burned, 0-5000." },
        notes: { type: "string", nullable: true },
        performed_on: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["name", "type", "duration_min", "calories_burned", "performed_on"],
    },
  },
  {
    name: "log_weight",
    description: "Record today's (or a specified date's) weight in kilograms. Upserts — replaces an existing entry for that date.",
    parameters: {
      type: "object",
      properties: {
        weight_kg: { type: "number", description: "Weight in kilograms." },
        note: { type: "string", nullable: true },
        logged_on: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["weight_kg", "logged_on"],
    },
  },
  {
    name: "get_today_summary",
    description: "Returns the user's daily targets and today's running totals (calories, macros, workouts). Use this for questions like 'how many calories left?' or 'what's my protein at?'.",
    parameters: { type: "object", properties: {} },
  },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

interface RequestBody {
  messages: ChatMessage[];
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response("GEMINI_API_KEY is not set on the server.", { status: 500 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: RequestBody;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  const userMessages = (body.messages ?? []).slice(-20).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0,
  );
  if (userMessages.length === 0 || userMessages[userMessages.length - 1]!.role !== "user") {
    return new Response("Last message must be from user", { status: 400 });
  }

  const today = todayISO();
  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single<Profile>();
  const { data: foodToday } = await supabase
    .from("food_logs").select("*").eq("user_id", user.id).eq("logged_on", today)
    .returns<FoodLog[]>();
  const { data: workoutsToday } = await supabase
    .from("workouts").select("*").eq("user_id", user.id).eq("performed_on", today)
    .returns<Workout[]>();

  const totals = (foodToday ?? []).reduce(
    (a, l) => ({
      cal: a.cal + Number(l.calories), p: a.p + Number(l.protein_g),
      c: a.c + Number(l.carbs_g), f: a.f + Number(l.fat_g),
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );
  const burned = (workoutsToday ?? []).reduce((s, w) => s + (w.calories_burned ?? 0), 0);

  const contextPrefix = [
    `Today is ${today} (${new Date().toLocaleDateString(undefined, { weekday: "long" })}). Local time hour: ${new Date().getHours()}.`,
    profile?.full_name ? `User: ${profile.full_name}.` : "",
    `Targets — ${profile?.daily_calorie_target ?? 2000} kcal, P${profile?.protein_target_g ?? 150}/C${profile?.carbs_target_g ?? 220}/F${profile?.fat_target_g ?? 70}g.`,
    `So far today: ${Math.round(totals.cal)} kcal eaten, ${burned} burned, P${Math.round(totals.p)}/C${Math.round(totals.c)}/F${Math.round(totals.f)}g.`,
    "",
    "User says:",
    userMessages[userMessages.length - 1]!.content,
  ].filter(Boolean).join("\n");

  // Gemini conversation: role is "user" | "model" (not "assistant"), parts is an array.
  const contents: Content[] = [
    ...userMessages.slice(0, -1).map((m): Content => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: contextPrefix }] },
  ];

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: object) => controller.enqueue(enc.encode(JSON.stringify(event) + "\n"));

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const llmStream = await ai.models.generateContentStream({
            model: MODEL,
            contents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
            },
          });

          // Accumulate this turn's parts so we can append the assistant turn back to contents.
          const assistantParts: Part[] = [];
          let pendingText = "";

          for await (const chunk of llmStream) {
            const parts = chunk.candidates?.[0]?.content?.parts ?? [];
            for (const part of parts) {
              if (typeof part.text === "string" && part.text.length > 0) {
                pendingText += part.text;
                send({ type: "text", delta: part.text });
              }
              if (part.functionCall) {
                // Flush any pending text into a single text part before the tool call.
                if (pendingText) {
                  assistantParts.push({ text: pendingText });
                  pendingText = "";
                }
                assistantParts.push({ functionCall: part.functionCall });
              }
            }
          }
          if (pendingText) assistantParts.push({ text: pendingText });

          contents.push({ role: "model", parts: assistantParts });

          const calls = assistantParts.filter((p): p is Part & { functionCall: NonNullable<Part["functionCall"]> } => !!p.functionCall);
          if (calls.length === 0) break;

          const responseParts: Part[] = [];
          for (const part of calls) {
            const fc = part.functionCall;
            const callId = fc.id ?? `${fc.name}-${responseParts.length}`;
            const exec = await runTool(fc.name ?? "", fc.args ?? {}, { userId: user.id, supabase });
            send({ type: "tool", id: callId, name: fc.name ?? "", input: fc.args ?? {}, result: exec.client });
            responseParts.push({
              functionResponse: {
                ...(fc.id ? { id: fc.id } : {}),
                name: fc.name ?? "",
                response: exec.isError
                  ? { error: (exec.model as { error?: string }).error ?? "Tool failed" }
                  : { result: exec.model },
              },
            });
          }

          contents.push({ role: "user", parts: responseParts });
        }

        send({ type: "done" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

interface ToolResult {
  client: Record<string, unknown>;
  model: Record<string, unknown>;
  isError: boolean;
}

type SbClient = ReturnType<typeof createClient>;

async function runTool(
  name: string,
  input: unknown,
  ctx: { userId: string; supabase: SbClient },
): Promise<ToolResult> {
  const i = (input ?? {}) as Record<string, unknown>;
  try {
    switch (name) {
      case "search_foods": {
        const query = String(i.query ?? "").trim();
        const q = ctx.supabase
          .from("foods")
          .select("id,name,brand,serving_size_g,calories,protein_g,carbs_g,fat_g")
          .order("name").limit(10);
        const { data, error } = query
          ? await q.ilike("name", `%${query}%`)
          : await q;
        if (error) throw error;
        const items = (data ?? []) as Pick<Food, "id"|"name"|"brand"|"serving_size_g"|"calories"|"protein_g"|"carbs_g"|"fat_g">[];
        return {
          client: { kind: "search", count: items.length },
          model: { results: items },
          isError: false,
        };
      }

      case "log_food": {
        const parsed = foodLogSchema.safeParse(i);
        if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
        const { data, error } = await ctx.supabase.from("food_logs").insert({
          user_id: ctx.userId,
          food_id: parsed.data.food_id ?? null,
          food_name: parsed.data.food_name,
          meal: parsed.data.meal,
          servings: parsed.data.servings,
          calories: parsed.data.calories,
          protein_g: parsed.data.protein_g,
          carbs_g: parsed.data.carbs_g,
          fat_g: parsed.data.fat_g,
          logged_on: parsed.data.logged_on,
        }).select().single<FoodLog>();
        if (error) throw error;
        return {
          client: {
            kind: "food",
            id: data.id,
            food_name: data.food_name,
            meal: data.meal,
            servings: Number(data.servings),
            calories: Number(data.calories),
            protein_g: Number(data.protein_g),
            carbs_g: Number(data.carbs_g),
            fat_g: Number(data.fat_g),
            logged_on: data.logged_on,
          },
          model: { ok: true, food_log_id: data.id },
          isError: false,
        };
      }

      case "log_workout": {
        const parsed = workoutSchema.safeParse(i);
        if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
        const { data, error } = await ctx.supabase.from("workouts").insert({
          user_id: ctx.userId,
          name: parsed.data.name,
          type: parsed.data.type,
          duration_min: parsed.data.duration_min,
          calories_burned: parsed.data.calories_burned ?? 0,
          notes: parsed.data.notes ?? null,
          performed_on: parsed.data.performed_on,
        }).select().single<Workout>();
        if (error) throw error;
        return {
          client: {
            kind: "workout",
            id: data.id,
            name: data.name,
            type: data.type,
            duration_min: data.duration_min,
            calories_burned: data.calories_burned,
            performed_on: data.performed_on,
          },
          model: { ok: true, workout_id: data.id },
          isError: false,
        };
      }

      case "log_weight": {
        const parsed = weightSchema.safeParse(i);
        if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
        const { data, error } = await ctx.supabase.from("weight_logs").upsert(
          {
            user_id: ctx.userId,
            weight_kg: parsed.data.weight_kg,
            note: parsed.data.note ?? null,
            logged_on: parsed.data.logged_on,
          },
          { onConflict: "user_id,logged_on" },
        ).select().single<WeightLog>();
        if (error) throw error;
        return {
          client: {
            kind: "weight",
            id: data.id,
            weight_kg: Number(data.weight_kg),
            logged_on: data.logged_on,
          },
          model: { ok: true, weight_log_id: data.id },
          isError: false,
        };
      }

      case "get_today_summary": {
        const today = todayISO();
        const [{ data: prof }, { data: foods }, { data: workouts }] = await Promise.all([
          ctx.supabase.from("profiles").select("*").eq("id", ctx.userId).single<Profile>(),
          ctx.supabase.from("food_logs").select("*").eq("user_id", ctx.userId).eq("logged_on", today).returns<FoodLog[]>(),
          ctx.supabase.from("workouts").select("*").eq("user_id", ctx.userId).eq("performed_on", today).returns<Workout[]>(),
        ]);
        const t = (foods ?? []).reduce(
          (a, l) => ({ cal: a.cal + Number(l.calories), p: a.p + Number(l.protein_g), c: a.c + Number(l.carbs_g), f: a.f + Number(l.fat_g) }),
          { cal: 0, p: 0, c: 0, f: 0 },
        );
        const burned = (workouts ?? []).reduce((s, w) => s + (w.calories_burned ?? 0), 0);
        const target = prof?.daily_calorie_target ?? 2000;
        return {
          client: { kind: "summary", target, eaten: Math.round(t.cal), burned, remaining: Math.round(target - t.cal + burned) },
          model: {
            target_calories: target,
            target_protein_g: prof?.protein_target_g ?? 150,
            target_carbs_g: prof?.carbs_target_g ?? 220,
            target_fat_g: prof?.fat_target_g ?? 70,
            eaten: { calories: Math.round(t.cal), protein_g: Math.round(t.p), carbs_g: Math.round(t.c), fat_g: Math.round(t.f) },
            burned_calories: burned,
            calories_remaining: Math.round(target - t.cal + burned),
            entries: (foods ?? []).length,
            workouts: (workouts ?? []).length,
          },
          isError: false,
        };
      }

      default:
        return { client: { kind: "error" }, model: { error: `Unknown tool: ${name}` }, isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return { client: { kind: "error", message }, model: { error: message }, isError: true };
  }
}
