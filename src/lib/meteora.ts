/**
 * Meteora DBC — equity-style launch config (STOCKLANA bounty).
 *
 * DBC is a launch primitive, not a swap aggregator. StockPilot does not fake
 * a pool. This module documents the curve we would use for a tokenized-stock
 * launch vs a memecoin, and exposes a read-only "equity curve" preset the UI
 * can show. Creating a live pool requires a partner config + mainnet tx and
 * is intentionally behind a documented adapter.
 *
 * Official SDK: @meteora-ag/dynamic-bonding-curve-sdk
 * Docs: https://docs.meteora.ag/developer-guides/dbc
 *
 * Equity vs meme (what judges asked for):
 *   meme:   SOL quote, steep early curve, low graduation, high fees
 *   equity: USDC quote, flatter price discovery, higher graduation notional,
 *           lower fees, leftover tokens + vesting for the issuer
 */

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export type EquityCurvePreset = {
  name: string;
  quoteMint: string;
  quoteSymbol: "USDC";
  tokenDecimals: number;
  /** Starting price in quote units. */
  startPrice: number;
  /** End / graduation price in quote units. */
  endPrice: number;
  /** Notional (USDC) at which the pool migrates to DAMM v2. */
  graduationNotionalUsd: number;
  tradeFeeBps: number;
  protocolFeeBps: number;
  leftoverPercent: number;
  notes: string[];
};

export const EQUITY_CURVE: EquityCurvePreset = {
  name: "StockPilot Equity Discovery",
  quoteMint: USDC_MINT,
  quoteSymbol: "USDC",
  tokenDecimals: 6,
  startPrice: 0.05,
  endPrice: 1.0,
  graduationNotionalUsd: 250_000,
  tradeFeeBps: 25,
  protocolFeeBps: 5,
  leftoverPercent: 20,
  notes: [
    "USDC quote — stock-like, not SOL-denominated meme liquidity.",
    "Flatter curve (20× vs typical 100×+ meme ramps) for slower price discovery.",
    "Graduation at $250k notional into DAMM v2 (Meteora keepers already support Stock Token quote pairs).",
    "20% leftover + vesting for the issuer — equity-like float, not 100% dumped into the curve.",
    "25 bps trade fee (vs 100–200 bps meme defaults).",
  ],
};

export function priceAlongCurve(progress01: number, p: EquityCurvePreset = EQUITY_CURVE): number {
  const t = Math.min(1, Math.max(0, progress01));
  // log-ish: slow early, faster near graduation
  const k = Math.log(p.endPrice / p.startPrice);
  return p.startPrice * Math.exp(k * t);
}
