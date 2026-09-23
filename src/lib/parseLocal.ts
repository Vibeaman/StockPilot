import type { ParsedStrategy, StrategyAction } from "./types";

const ASSETS = [
  "NVDA",
  "AAPL",
  "TSLA",
  "MSFT",
  "SPACEX",
  "OPENAI",
  "ANDURIL",
  "ANTHROPIC",
  "FIGUREAI",
  "KALSHI",
  "NEURALINK",
  "POLYMARKET",
];

const HINT =
  'I need a specific condition and amount. Example: Buy $100 of NVDA if it falls 2% below its reference price.';

export function parseLocal(prompt: string): ParsedStrategy | { error: string; hint: string } {
  const text = prompt.trim();
  const upper = text.toUpperCase();

  const asset = ASSETS.find((a) => new RegExp(`\\b${a}X?\\b`).test(upper));
  if (!asset) {
    return { error: "Ambiguous strategy", hint: HINT };
  }

  let action: StrategyAction = "BUY";
  if (/\bSELL\b/.test(upper)) action = "SELL";
  else if (/\bALERT\b|\bWATCH\b|\bNOTIFY\b/.test(upper)) action = "ALERT";
  else if (!/\bBUY\b|\bLONG\b|\bPURCHASE\b/.test(upper) && action === "BUY") {
    if (!/\$/.test(text) && !/\bBUY\b/.test(upper)) {
      // still allow implicit buy if amount + condition exist
    }
  }

  const amountMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)/) || text.match(/\b([\d,]+(?:\.\d+)?)\s*(?:USD|DOLLARS?)\b/i);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Ambiguous strategy", hint: HINT };
  }

  const pctBelowRef = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:below|under|less than)\s*(?:its\s+)?reference/i);
  const pctAboveRef = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:above|over)\s*(?:its\s+)?reference/i);
  const belowDollar = text.match(/(?:below|under|less than)\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
  const aboveDollar = text.match(/(?:above|over)\s*\$?\s*([\d,]+(?:\.\d+)?)/i);

  if (pctBelowRef) {
    const pct = Number(pctBelowRef[1]);
    return {
      asset,
      action,
      amount,
      conditionType: "PRICE_BELOW_REFERENCE",
      referenceMultiplier: 1 - pct / 100,
    };
  }
  if (pctAboveRef) {
    const pct = Number(pctAboveRef[1]);
    return {
      asset,
      action,
      amount,
      conditionType: "PRICE_ABOVE_REFERENCE",
      referenceMultiplier: 1 + pct / 100,
    };
  }
  if (belowDollar && !pctBelowRef) {
    const threshold = Number(belowDollar[1].replace(/,/g, ""));
    if (Number.isFinite(threshold)) {
      return { asset, action, amount, conditionType: "PRICE_BELOW", threshold };
    }
  }
  if (aboveDollar && !pctAboveRef) {
    const threshold = Number(aboveDollar[1].replace(/,/g, ""));
    if (Number.isFinite(threshold)) {
      return { asset, action, amount, conditionType: "PRICE_ABOVE", threshold };
    }
  }

  return { error: "Ambiguous strategy", hint: HINT };
}
