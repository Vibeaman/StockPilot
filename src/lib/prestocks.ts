import { PRESTOCK_FALLBACK, premiumDiscount } from "./assets";
import type { Asset, PriceQuote } from "./types";

const API = "https://prestocks.com/api/prestocks";

type Row = {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  external_url?: string;
  contract_address: string;
  markPrice: number;
  tokenPrice: number;
  markValuation?: number;
  impliedValuation?: number;
  supply?: number;
};

function fallback(): { assets: Asset[]; quotes: PriceQuote[] } {
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

export async function fetchPreStocks(): Promise<{ assets: Asset[]; quotes: PriceQuote[] }> {
  const res = await fetch(API, { next: { revalidate: 30 } });
  if (!res.ok) return fallback();
  const rows: Row[] = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return fallback();

  const assets: Asset[] = rows.map((r) => ({
    symbol: r.symbol,
    name: r.name.replace(/ PreStocks$/i, ""),
    kind: "prestock",
    mint: r.contract_address,
    decimals: 6,
    logo: r.image,
    source: "PreStocks",
    description: r.description,
    markValuation: r.markValuation,
    impliedValuation: r.impliedValuation,
    supply: r.supply,
    externalUrl: r.external_url,
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
