import { XSTOCKS, premiumDiscount } from "./assets";
import type { PriceQuote } from "./types";

const PRO_HISTORY = "https://pyth.dourolabs.app/v1/fixed_rate@1000ms/history";
const HERMES_PRO = "https://pyth.dourolabs.app/hermes/v2/updates/price/latest";
const HERMES_PUBLIC = "https://hermes.pyth.network/v2/updates/price/latest";
const JUPITER_PRICE = "https://lite-api.jup.ag/price/v3";

type HermesPrice = {
  id: string;
  price?: { price: string; expo: number; publish_time: number };
};

function toNumber(p?: { price: string; expo: number }): number | null {
  if (!p) return null;
  const n = Number(p.price) * Math.pow(10, p.expo);
  return Number.isFinite(n) ? n : null;
}

function missingMarket(quotes: PriceQuote[]): boolean {
  return quotes.some((q) => q.marketPrice == null);
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
  const from = to - 7 * 24 * 60 * 60;
  const url = `${PRO_HISTORY}?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&resolution=1D`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
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
        a.marketSymbol ? fetchProBar(a.marketSymbol, key).catch(() => null) : Promise.resolve(null),
        a.referenceSymbol ? fetchProBar(a.referenceSymbol, key).catch(() => null) : Promise.resolve(null),
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

async function fetchFromHermes(base: string, key?: string): Promise<PriceQuote[]> {
  const ids = XSTOCKS.flatMap((a) => [a.marketFeedId, a.referenceFeedId]).filter(Boolean) as string[];
  const qs = ids.map((id) => `ids[]=${id.startsWith("0x") ? id : `0x${id}`}`).join("&");
  const headers: Record<string, string> = {};
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${base}?${qs}&parsed=true`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Pyth Hermes ${res.status} (${base})`);
  const json = await res.json();
  const parsed: HermesPrice[] = json.parsed ?? [];
  const byId = new Map(parsed.map((p) => [p.id.replace(/^0x/, ""), p]));
  return XSTOCKS.map((a) => {
    const m = a.marketFeedId ? byId.get(a.marketFeedId.replace(/^0x/, "")) : undefined;
    const r = a.referenceFeedId ? byId.get(a.referenceFeedId.replace(/^0x/, "")) : undefined;
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

async function fetchFromJupiter(): Promise<PriceQuote[]> {
  const ids = XSTOCKS.map((a) => a.mint).join(",");
  const res = await fetch(`${JUPITER_PRICE}?ids=${ids}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Jupiter price ${res.status}`);
  const json = await res.json();
  const table = (json.data ?? json) as Record<
    string,
    { usdPrice?: number; price?: number; stockData?: { price?: number } }
  >;
  return XSTOCKS.map((a) => {
    const row = table[a.mint];
    const marketPrice = row?.usdPrice ?? row?.price ?? null;
    const referencePrice = row?.stockData?.price ?? null;
    const m = marketPrice != null ? Number(marketPrice) : null;
    const r = referencePrice != null ? Number(referencePrice) : null;
    return {
      symbol: a.symbol,
      marketPrice: m,
      referencePrice: r,
      premiumDiscountPct: premiumDiscount(m, r),
      marketFeedId: a.marketFeedId,
      referenceFeedId: a.referenceFeedId,
      source: "pyth" as const,
    };
  });
}

function mergeQuotes(primary: PriceQuote[], fallback: PriceQuote[]): PriceQuote[] {
  const extra = new Map(fallback.map((q) => [q.symbol, q]));
  return primary.map((q) => {
    const f = extra.get(q.symbol);
    if (!f) return q;
    const marketPrice = q.marketPrice ?? f.marketPrice;
    const referencePrice = q.referencePrice ?? f.referencePrice;
    return {
      ...q,
      marketPrice,
      referencePrice,
      premiumDiscountPct: premiumDiscount(marketPrice, referencePrice),
      marketPublishTime: q.marketPublishTime ?? f.marketPublishTime,
      referencePublishTime: q.referencePublishTime ?? f.referencePublishTime,
    };
  });
}

/**
 * Prefer Pyth Pro History (Terminal key on pyth.dourolabs.app).
 * Then authenticated Hermes, then public Hermes, then Jupiter USD prices for the xStock mint.
 */
export async function fetchPythQuotes(): Promise<PriceQuote[]> {
  const key = process.env.PYTH_API_KEY?.trim();
  let quotes: PriceQuote[] = XSTOCKS.map((a) => ({
    symbol: a.symbol,
    marketPrice: null,
    referencePrice: null,
    premiumDiscountPct: null,
    marketFeedId: a.marketFeedId,
    referenceFeedId: a.referenceFeedId,
    source: "pyth" as const,
  }));

  if (key) {
    try {
      quotes = mergeQuotes(quotes, await fetchFromPro(key));
    } catch (e) {
      console.error("pyth pro", e);
    }
    if (missingMarket(quotes)) {
      try {
        quotes = mergeQuotes(quotes, await fetchFromHermes(HERMES_PRO, key));
      } catch (e) {
        console.error("pyth hermes pro", e);
      }
    }
  }

  if (missingMarket(quotes)) {
    try {
      quotes = mergeQuotes(quotes, await fetchFromHermes(HERMES_PUBLIC, key));
    } catch (e) {
      console.error("pyth hermes public", e);
    }
  }

  if (missingMarket(quotes)) {
    try {
      quotes = mergeQuotes(quotes, await fetchFromJupiter());
    } catch (e) {
      console.error("jupiter price", e);
    }
  }

  return quotes;
}
