import type { ParsedStrategy, PriceQuote, Strategy } from "./types";

export function describeCondition(s: ParsedStrategy | Strategy): string {
  switch (s.conditionType) {
    case "PRICE_BELOW_REFERENCE":
      return `market ≤ reference × ${(s.referenceMultiplier ?? 0.98).toFixed(2)}`;
    case "PRICE_ABOVE_REFERENCE":
      return `market ≥ reference × ${(s.referenceMultiplier ?? 1.02).toFixed(2)}`;
    case "PRICE_BELOW":
      return `market ≤ $${(s.threshold ?? 0).toFixed(2)}`;
    case "PRICE_ABOVE":
      return `market ≥ $${(s.threshold ?? 0).toFixed(2)}`;
  }
}

export function evaluate(s: ParsedStrategy | Strategy, q: PriceQuote | undefined): {
  triggered: boolean;
  reason: string;
} {
  if (!q || q.marketPrice == null) {
    return { triggered: false, reason: "No market price" };
  }
  const m = q.marketPrice;
  switch (s.conditionType) {
    case "PRICE_BELOW_REFERENCE": {
      if (q.referencePrice == null) return { triggered: false, reason: "No reference price" };
      const target = q.referencePrice * (s.referenceMultiplier ?? 0.98);
      return m <= target
        ? { triggered: true, reason: `Market $${m.toFixed(2)} ≤ target $${target.toFixed(2)}` }
        : { triggered: false, reason: `Market $${m.toFixed(2)} > target $${target.toFixed(2)}` };
    }
    case "PRICE_ABOVE_REFERENCE": {
      if (q.referencePrice == null) return { triggered: false, reason: "No reference price" };
      const target = q.referencePrice * (s.referenceMultiplier ?? 1.02);
      return m >= target
        ? { triggered: true, reason: `Market $${m.toFixed(2)} ≥ target $${target.toFixed(2)}` }
        : { triggered: false, reason: `Market $${m.toFixed(2)} < target $${target.toFixed(2)}` };
    }
    case "PRICE_BELOW": {
      const t = s.threshold ?? 0;
      return m <= t
        ? { triggered: true, reason: `Market $${m.toFixed(2)} ≤ $${t.toFixed(2)}` }
        : { triggered: false, reason: `Market $${m.toFixed(2)} > $${t.toFixed(2)}` };
    }
    case "PRICE_ABOVE": {
      const t = s.threshold ?? 0;
      return m >= t
        ? { triggered: true, reason: `Market $${m.toFixed(2)} ≥ $${t.toFixed(2)}` }
        : { triggered: false, reason: `Market $${m.toFixed(2)} < $${t.toFixed(2)}` };
    }
  }
}

export function defaultName(s: ParsedStrategy): string {
  if (s.name) return s.name;
  const verb =
    s.action === "BUY" ? "Buyer" : s.action === "SELL" ? "Seller" : "Watcher";
  return `${s.asset} ${verb}`;
}

/**
 * Unrealized P&L if the PreStock token converges to the SPV mark.
 * BUY cheap (discount): profit as token rises toward mark.
 * SELL rich (premium): profit as token falls toward mark.
 */
export function convergencePnl(params: {
  side: "BUY" | "SELL";
  notionalUsd: number;
  entryToken: number;
  liveToken: number | null;
  liveMark: number | null;
}): { toMark: number | null; markToMarket: number | null } {
  const { side, notionalUsd, entryToken, liveToken, liveMark } = params;
  if (!entryToken || !Number.isFinite(entryToken)) {
    return { toMark: null, markToMarket: null };
  }
  const dir = side === "BUY" ? 1 : -1;
  const toMark =
    liveMark != null && Number.isFinite(liveMark)
      ? dir * notionalUsd * (liveMark / entryToken - 1)
      : null;
  const markToMarket =
    liveToken != null && Number.isFinite(liveToken)
      ? dir * notionalUsd * (liveToken / entryToken - 1)
      : null;
  return { toMark, markToMarket };
}
