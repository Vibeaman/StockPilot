import { VersionedTransaction } from "@solana/web3.js";
import { USDC_MINT } from "./assets";

const ULTRA = "https://lite-api.jup.ag/ultra/v1";

export type SwapQuote = {
  outAmount: string;
  inAmount: string;
  requestId?: string;
  transaction?: string;
  error?: string;
};

/**
 * Quote a USDC -> token (BUY) or token -> USDC (SELL) swap via Jupiter Ultra.
 * Returns a serialized VersionedTransaction the wallet must sign.
 * Never pretends a swap happened.
 */
export async function quoteSwap(params: {
  inputMint: string;
  outputMint: string;
  amount: number; // human units of input
  decimals: number;
  taker: string;
}): Promise<SwapQuote> {
  const raw = Math.floor(params.amount * 10 ** params.decimals);
  if (raw <= 0) return { outAmount: "0", inAmount: "0", error: "Amount too small" };

  const url = new URL(`${ULTRA}/order`);
  url.searchParams.set("inputMint", params.inputMint);
  url.searchParams.set("outputMint", params.outputMint);
  url.searchParams.set("amount", String(raw));
  url.searchParams.set("taker", params.taker);
  url.searchParams.set("slippageBps", "50");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    return { outAmount: "0", inAmount: String(raw), error: `Jupiter ${res.status}: ${text.slice(0, 180)}` };
  }
  const json = await res.json();
  return {
    outAmount: json.outAmount ?? json.outAmountLamports ?? "0",
    inAmount: json.inAmount ?? String(raw),
    requestId: json.requestId,
    transaction: json.transaction,
    error: json.errorMessage,
  };
}

export function deserializeSwapTx(b64: string): VersionedTransaction {
  const buf = Buffer.from(b64, "base64");
  return VersionedTransaction.deserialize(buf);
}

export { USDC_MINT };
