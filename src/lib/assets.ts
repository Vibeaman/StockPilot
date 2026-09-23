import type { Asset } from "./types";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const USDC_MINT = USDC;

/**
 * Verified xStock mints (Backed / Kraken) and Pyth Hermes feed IDs
 * pulled live from hermes.pyth.network/v2/price_feeds.
 *
 * market  = Crypto.{TICKER}X/USD  (24/7 on-chain tokenized stock)
 * reference = Equity.US.{TICKER}/USD  (NYSE/Nasdaq cash print)
 */
export const XSTOCKS: Asset[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    kind: "xstock",
    mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
    decimals: 8,
    source: "xStocks",
    marketFeedId: "4244d07890e4610f46bbde67de8f43a4bf8b569eebe904f136b469f148503b7f",
    referenceFeedId: "b1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
  },
  {
    symbol: "AAPL",
    name: "Apple",
    kind: "xstock",
    mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    decimals: 8,
    source: "xStocks",
    marketFeedId: "978e6cc68a119ce066aa830017318563a9ed04ec3a0a6439010fc11296a58675",
    referenceFeedId: "49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    kind: "xstock",
    mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
    decimals: 8,
    source: "xStocks",
    marketFeedId: "47a156470288850a440df3a6ce85a55917b813a19bb5b31128a33a986566a362",
    referenceFeedId: "16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    kind: "xstock",
    mint: "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX",
    decimals: 8,
    source: "xStocks",
    marketFeedId: "bb723a70af731ab56b9a650eb7e8ac22b7bc07ea77f8670bd1fa9a37bf6df3f5",
    referenceFeedId: "d0ca23c1cc005e004ccf1db5bf76aeb6a49218f43dac3d4b275e92de12ded4d1",
  },
];

export const PRESTOCK_FALLBACK: Asset[] = [
  {
    symbol: "SPACEX",
    name: "SpaceX",
    kind: "prestock",
    mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    decimals: 6,
    source: "PreStocks",
    logo: "https://www.prestocks.com/logos/spacex.png",
  },
  {
    symbol: "OPENAI",
    name: "OpenAI",
    kind: "prestock",
    mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
    decimals: 6,
    source: "PreStocks",
    logo: "https://www.prestocks.com/logos/openai.png",
  },
  {
    symbol: "ANDURIL",
    name: "Anduril",
    kind: "prestock",
    mint: "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB",
    decimals: 6,
    source: "PreStocks",
    logo: "https://www.prestocks.com/logos/anduril.png",
  },
  {
    symbol: "ANTHROPIC",
    name: "Anthropic",
    kind: "prestock",
    mint: "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw",
    decimals: 6,
    source: "PreStocks",
    logo: "https://www.prestocks.com/logos/anthropic.png",
  },
];

export function allStaticAssets(): Asset[] {
  return [...XSTOCKS, ...PRESTOCK_FALLBACK];
}

export function findAsset(symbol: string, extras: Asset[] = []): Asset | undefined {
  const s = symbol.toUpperCase().replace(/X$/, "");
  return [...extras, ...allStaticAssets()].find(
    (a) => a.symbol.toUpperCase() === s || a.symbol.toUpperCase() === symbol.toUpperCase()
  );
}

export function premiumDiscount(market: number | null, reference: number | null): number | null {
  if (market == null || reference == null || reference === 0) return null;
  return ((market - reference) / reference) * 100;
}
