import { PRESTOCK_FALLBACK, premiumDiscount } from "./assets";
import type { Asset, PriceQuote } from "./types";

const API = "https://prestocks.com/api/prestocks";

type Row = {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  contract_address: string;
  markPrice: number;
  tokenPrice: number;
};

export async function fetchPreStocks(): Promise<{ assets: Asset[]; quotes: PriceQuote[] }> {
  const res = await fetch(API, { next: { revalidate: 30 } });
  if (!res.ok) {
    return {
      assets: PRESTOCK_FALLBACK,
      quotes: PRESTOCK_FALLBACK.map((a) => ({
        symbol: a.symbol,
        marketPrice: null,
        referencePrice: null,
        premiumDiscountPct: null,
        source: "prestocks" as const,
      })),
    };
  }
  const rows: Row[] = await res.json();
  const assets: Asset[] = rows.map((r) => ({
    symbol: r.symbol,
    name: r.name.replace(/ PreStocks$/i, ""),
    kind: "prestock",
    mint: r.contract_address,
    decimals: 6,
    logo: r.image,
    source: "PreStocks",
  }));
  const quotes: PriceQuote[] = rows.map((r) => ({
    symbol: r.symbol,
    marketPrice: r.tokenPrice,
    referencePrice: r.markPrice,
    premiumDiscountPct: premiumDiscount(r.tokenPrice, r.markPrice),
    source: "prestocks",
  }));
  return { assets, quotes };
}
