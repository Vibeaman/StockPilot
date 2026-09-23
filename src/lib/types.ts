export type AssetKind = "xstock" | "prestock";
export type StrategyAction = "BUY" | "SELL" | "ALERT";
export type ConditionType =
  | "PRICE_BELOW_REFERENCE"
  | "PRICE_ABOVE_REFERENCE"
  | "PRICE_BELOW"
  | "PRICE_ABOVE";
export type StrategyStatus = "ACTIVE" | "PAUSED" | "TRIGGERED";
export type TxStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

export type Asset = {
  symbol: string;
  name: string;
  kind: AssetKind;
  mint: string;
  decimals: number;
  logo?: string;
  marketFeedId?: string;
  referenceFeedId?: string;
  /** Pyth Pro History API symbols, e.g. Crypto.NVDAX/USD */
  marketSymbol?: string;
  referenceSymbol?: string;
  source: "xStocks" | "PreStocks";
};

export type PriceQuote = {
  symbol: string;
  marketPrice: number | null;
  referencePrice: number | null;
  premiumDiscountPct: number | null;
  marketFeedId?: string;
  referenceFeedId?: string;
  marketPublishTime?: number;
  referencePublishTime?: number;
  marketHoursOpen?: boolean;
  source: "pyth" | "prestocks" | "demo";
};

export type ParsedStrategy = {
  asset: string;
  action: StrategyAction;
  amount: number;
  conditionType: ConditionType;
  threshold?: number;
  referenceMultiplier?: number;
  name?: string;
};

export type Strategy = ParsedStrategy & {
  id: string;
  wallet: string;
  status: StrategyStatus;
  createdAt: string;
  updatedAt: string;
  lastEvaluatedAt?: string;
  lastTriggerReason?: string;
};

export type Activity = {
  id: string;
  wallet: string;
  strategyId?: string;
  asset: string;
  action: StrategyAction;
  amount: number;
  signature?: string;
  status: TxStatus;
  createdAt: string;
  note?: string;
};

export type ParseError = {
  error: string;
  hint?: string;
};
