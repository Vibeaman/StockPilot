import { XSTOCKS, premiumDiscount } from "./assets";
import type { PriceQuote } from "./types";

const PRO_HISTORY = "https://pyth.dourolabs.app/v1/fixed_rate@1000ms/history";
const HERMES = "https://hermes.pyth.network";

type HermesPrice = {
  id: string;
  price?: { price: string; expo: number; publish_time: number };
};

function toNumber(p?: { price: string; expo: number }): number | null {
  if (!p) return null;
  const n = Number(p.price) * Math.pow(10, p.expo);
  return Number.isFinite(n) ? n : null;
}

function lastClose(json: unknown): { price: number; time?: number } | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const closes = (j.c ?? j.close ?? j.closes) as number[] | undefined;
  const times = (j.t ?? j.time ?? j.times) as number[] | undefined;
  if (Array.isArray(closes) && closes.length) {
    const price = Number(closes[closes.length - 1]);
    const time = Array.isArray(times) ? Number(times[times.length - 1]) : undefined;
    return Number.isFinite(price) ? { price, time } : null;
  }
  if (Array.isArray(j.data) && j.data.length) {
    const row = j.data[j.data.length - 1] as Record<string, unknown>;
    const price = Number(row.close ?? row.c ?? row.price);
    return Number.isFinite(price) ? { price } : null;
  }
  return null;
}

async function fetchProBar(symbol: string, key: string): Promise<{ price: number; time?: number } | null> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 3 * 24 * 60 * 60;
  const url = `${PRO_HISTORY}?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&resolution=1D`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 15 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pyth Pro ${res.status} ${symbol}: ${text.slice(0, 120)}`);
  }
  return lastClose(await res.json());
}

async function fetchFromPro(key: string): Promise<PriceQuote[]> {
  return Promise.all(
    XSTOCKS.map(async (a) => {
      const [m, r] = await Promise.all([
        a.marketSymbol ? fetchProBar(a.marketSymbol, key) : Promise.resolve(null),
        a.referenceSymbol ? fetchProBar(a.referenceSymbol, key) : Promise.resolve(null),
      ]);
      const marketPrice = m?.price ?? null;
      const referencePrice = r?.price ?? null;
      return {
        symbol: a.symbol,
        marketPrice,
        referencePrice,
        premiumDiscountPct: premiumDiscount(marketPrice, referencePrice),
        marketFeedId: a.marketFeedId,
        referenceFeedId: a.referenceFeedId,
        marketPublishTime: m?.time,
        referencePublishTime: r?.time,
        source: "pyth" as const,
      };
    })
  );
}

async function fetchFromHermes(key?: string): Promise<PriceQuote[]> {
  const ids = XSTOCKS.flatMap((a) => [a.marketFeedId, a.referenceFeedId]).filter(Boolean) as string[];
  const qs = ids.map((id) => `ids[]=${id}`).join("&");
  const headers: Record<string, string> = {};
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${HERMES}/v2/updates/price/latest?${qs}&parsed=true`, {
    headers,
    next: { revalidate: 8 },
  });
  if (!res.ok) throw new Error(`Pyth Hermes ${res.status}`);
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

/**
 * Prefer Pyth Pro History (the key from Pyth Terminal / dourolabs.app).
 * Fall back to public Hermes if Pro is unset or fails.
 */
export async function fetchPythQuotes(): Promise<PriceQuote[]> {
  const key = process.env.PYTH_API_KEY;
  if (key) {
    try {
      return await fetchFromPro(key);
    } catch (e) {
      console.error("pyth pro", e);
    }
  }
  return fetchFromHermes(key);
}
