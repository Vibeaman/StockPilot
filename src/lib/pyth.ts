import { XSTOCKS, premiumDiscount } from "./assets";
import type { PriceQuote } from "./types";

const HERMES = "https://hermes.pyth.network";

type HermesPrice = {
  id: string;
  price?: { price: string; expo: number; publish_time: number };
  ema_price?: { price: string; expo: number; publish_time: number };
};

function toNumber(p?: { price: string; expo: number }): number | null {
  if (!p) return null;
  const n = Number(p.price) * Math.pow(10, p.expo);
  return Number.isFinite(n) ? n : null;
}

export async function fetchPythQuotes(): Promise<PriceQuote[]> {
  const ids = XSTOCKS.flatMap((a) => [a.marketFeedId, a.referenceFeedId]).filter(
    Boolean
  ) as string[];
  const qs = ids.map((id) => `ids[]=${id}`).join("&");
  const headers: Record<string, string> = {};
  if (process.env.PYTH_API_KEY) {
    headers.Authorization = `Bearer ${process.env.PYTH_API_KEY}`;
  }

  const res = await fetch(`${HERMES}/v2/updates/price/latest?${qs}&parsed=true`, {
    headers,
    next: { revalidate: 8 },
  });
  if (!res.ok) {
    throw new Error(`Pyth Hermes ${res.status}`);
  }
  const json = await res.json();
  const parsed: HermesPrice[] = json.parsed ?? [];
  const byId = new Map(parsed.map((p) => [p.id.replace(/^0x/, ""), p]));

  return XSTOCKS.map((a) => {
    const m = a.marketFeedId ? byId.get(a.marketFeedId) : undefined;
    const r = a.referenceFeedId ? byId.get(a.referenceFeedId) : undefined;
    const marketPrice = toNumber(m?.price);
    const referencePrice = toNumber(r?.price);
    return {
      symbol: a.symbol,
      marketPrice,
      referencePrice,
      premiumDiscountPct: premiumDiscount(marketPrice, referencePrice),
      marketFeedId: a.marketFeedId,
      referenceFeedId: a.referenceFeedId,
      marketPublishTime: m?.price?.publish_time,
      referencePublishTime: r?.price?.publish_time,
      source: "pyth" as const,
    };
  });
}
