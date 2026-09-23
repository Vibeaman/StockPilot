import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { parseLocal } from "@/lib/parseLocal";

export const dynamic = "force-dynamic";

const Schema = z.object({
  asset: z.string().min(1).max(16).transform((s) => s.toUpperCase().replace(/X$/, "")),
  action: z.enum(["BUY", "SELL", "ALERT"]),
  amount: z.number().positive().max(1_000_000),
  conditionType: z.enum([
    "PRICE_BELOW_REFERENCE",
    "PRICE_ABOVE_REFERENCE",
    "PRICE_BELOW",
    "PRICE_ABOVE",
  ]),
  threshold: z.number().positive().optional(),
  referenceMultiplier: z.number().min(0.5).max(1.5).optional(),
  name: z.string().max(48).optional(),
});

const SYSTEM = `You convert natural-language trading instructions for tokenized stocks into JSON.

Allowed assets: NVDA, AAPL, TSLA, MSFT (xStocks) and PreStocks tickers like SPACEX, OPENAI, ANDURIL, ANTHROPIC, FIGUREAI, KALSHI, NEURALINK, POLYMARKET.

Rules:
- Return ONLY JSON. No markdown.
- amount is USD notional (number).
- "2% below reference" => conditionType PRICE_BELOW_REFERENCE, referenceMultiplier 0.98
- "3% above reference" => PRICE_ABOVE_REFERENCE, referenceMultiplier 1.03
- "below $180" => PRICE_BELOW, threshold 180
- "above $200" => PRICE_ABOVE, threshold 200
- If the user is ambiguous (no amount, no numeric condition, "when it looks cheap"), return:
  {"error":"ambiguous","hint":"I need a specific condition and amount. Example: Buy $100 of AAPL when it is 3% below its reference price."}
- Never invent a trade the user did not specify.
- action is BUY, SELL, or ALERT.`;

function finish(raw: unknown) {
  if (raw && typeof raw === "object" && "error" in raw) {
    const r = raw as { error: string; hint?: string };
    return NextResponse.json({
      error: r.error === "ambiguous" ? "Ambiguous strategy" : r.error,
      hint: r.hint,
    });
  }
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Could not validate that strategy",
      hint: "Try: Buy $100 of NVDA if it falls 2% below its reference price.",
    });
  }
  const s = parsed.data;
  if (s.conditionType.includes("REFERENCE") && s.referenceMultiplier == null) {
    return NextResponse.json({
      error: "Missing reference multiplier",
      hint: "Specify a percent vs the reference price, e.g. 2% below reference.",
    });
  }
  if ((s.conditionType === "PRICE_BELOW" || s.conditionType === "PRICE_ABOVE") && s.threshold == null) {
    return NextResponse.json({
      error: "Missing price threshold",
      hint: "Specify a dollar price, e.g. below $180.",
    });
  }
  return NextResponse.json(s);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const local = parseLocal(prompt);
  if (!("error" in local)) {
    return finish(local);
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return finish(local);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `${SYSTEM}\n\nUser: ${prompt}`,
    });
    const text = (result.text ?? "").trim();
    const jsonText = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const raw = JSON.parse(jsonText);
    return finish(raw);
  } catch (e: unknown) {
    console.error("parse", e);
    return finish(local);
  }
}
