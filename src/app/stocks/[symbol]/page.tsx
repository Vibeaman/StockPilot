"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PRESTOCK_FALLBACK, findAsset } from "@/lib/assets";
import { fmtPct, fmtUsd, cn, explorerToken, shortAddr } from "@/lib/format";
import type { Asset, PriceQuote } from "@/lib/types";

type Payload = { quotes: PriceQuote[]; prestocks: Asset[] };

export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    fetch("/api/prices", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const extras = data?.prestocks ?? PRESTOCK_FALLBACK;
  const asset = findAsset(String(symbol), extras);
  const quote = data?.quotes.find((q) => q.symbol === asset?.symbol);

  const chart = useMemo(() => {
    if (!quote?.marketPrice) return [];
    const mid = quote.marketPrice;
    return Array.from({ length: 24 }, (_, i) => ({
      t: `${i}h`,
      p: mid * (1 + Math.sin(i / 4) * 0.012 + (i - 12) * 0.0004),
    }));
  }, [quote?.marketPrice]);

  if (!asset) {
    return <p className="text-[#9a96b0]">Unknown asset.</p>;
  }

  const pd = quote?.premiumDiscountPct;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#9a96b0]">{asset.source}</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {asset.symbol} <span className="text-[#9a96b0] text-xl font-normal">{asset.name}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/terminal?asset=${asset.symbol}`}
            className="px-4 py-2 text-sm bg-[#14f195] text-black font-medium"
          >
            Create strategy
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Market" value={fmtUsd(quote?.marketPrice)} hint={asset.kind === "xstock" ? "Crypto.xStock/USD" : "token price"} />
        <Stat label="Reference" value={fmtUsd(quote?.referencePrice)} hint={asset.kind === "xstock" ? "Equity.US cash print" : "PreStocks mark"} />
        <Stat
          label="Prem / Disc"
          value={fmtPct(pd)}
          className={pd != null && pd < 0 ? "down" : "up"}
          hint="(market − reference) / reference"
        />
        <Stat label="Hours" value={quote?.marketHoursOpen === false ? "Cash closed" : "24/7 token"} />
      </div>

      <div className="panel p-4 h-64">
        <div className="text-[11px] uppercase tracking-widest text-[#9a96b0] mb-2">
          Intraday sketch (not a historical Pyth series)
        </div>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={chart}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14f195" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#14f195" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#0e1014", border: "1px solid rgba(255,255,255,0.1)" }}
              formatter={(v) => fmtUsd(typeof v === "number" ? v : Number(v))}
            />
            <Area type="monotone" dataKey="p" stroke="#14f195" fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="panel p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-[#9a96b0]">Mint</span>
          <a className="mono text-[#14f195]" href={explorerToken(asset.mint)} target="_blank" rel="noreferrer">
            {shortAddr(asset.mint, 6)}
          </a>
        </div>
        {asset.marketFeedId && (
          <div className="flex justify-between gap-4">
            <span className="text-[#9a96b0]">Pyth market feed</span>
            <span className="mono text-xs break-all">{asset.marketFeedId.slice(0, 16)}…</span>
          </div>
        )}
        {asset.referenceFeedId && (
          <div className="flex justify-between gap-4">
            <span className="text-[#9a96b0]">Pyth reference feed</span>
            <span className="mono text-xs break-all">{asset.referenceFeedId.slice(0, 16)}…</span>
          </div>
        )}
        <p className="text-xs text-[#9a96b0] pt-2">
          Generated analysis, not financial advice.{" "}
          {pd != null && pd < 0
            ? `${asset.symbol} trades ${fmtPct(pd)} below its reference — the token is at a discount to the cash print.`
            : pd != null
            ? `${asset.symbol} trades ${fmtPct(pd)} above its reference — a premium to the cash print.`
            : "Waiting on a live quote."}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="text-[11px] uppercase tracking-widest text-[#9a96b0]">{label}</div>
      <div className={cn("text-xl font-medium mt-1 mono", className)}>{value}</div>
      {hint && <div className="text-[11px] text-[#9a96b0] mt-1">{hint}</div>}
    </div>
  );
}
