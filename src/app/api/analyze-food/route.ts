import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export interface FoodAnalysis {
  food_name: string;
  portion_description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low";
}

const PROMPT = `You are a nutrition expert analyzing a food photo.

Return ONLY a valid JSON object — no markdown, no code fences, no extra text — with exactly these fields:
{
  "food_name": "concise name of the food or dish",
  "portion_description": "e.g. '1 medium banana (118g)' or '1 plate rice + grilled chicken'",
  "calories": <integer, total estimated kcal for what is visible>,
  "protein_g": <number to 1 decimal>,
  "carbs_g": <number to 1 decimal>,
  "fat_g": <number to 1 decimal>,
  "confidence": "high" | "medium" | "low"
}

Rules:
- Estimate for the entire plate/portion visible in the image.
- If multiple foods are visible, sum them into a single total.
- Use realistic portion sizes. A typical restaurant plate of rice is ~250g cooked.
- confidence = "high" if the food is clearly identifiable, "medium" if mostly clear, "low" if unclear/obscured.
- If the image contains no food, still return valid JSON with 0 values and confidence "low".
- Never wrap the response in markdown or add any text outside the JSON.`;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  // 10 MB limit
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "Image too large (max 10 MB)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = (file.type || "image/jpeg") as string;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: PROMPT },
          ],
        },
      ],
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const result: FoodAnalysis = JSON.parse(cleaned);

    // Sanitise numeric fields
    result.calories = Math.round(Math.max(0, Number(result.calories) || 0));
    result.protein_g = Math.max(0, Number(result.protein_g) || 0);
    result.carbs_g = Math.max(0, Number(result.carbs_g) || 0);
    result.fat_g = Math.max(0, Number(result.fat_g) || 0);

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
