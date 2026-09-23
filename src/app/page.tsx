"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { XSTOCKS } from "@/lib/assets";
import { fmtPct, fmtUsd, cn } from "@/lib/format";
import { loadActivity, loadStrategies } from "@/lib/store";
import type { Activity, Asset, PriceQuote, Strategy } from "@/lib/types";

type Payload = { quotes: PriceQuote[]; prestocks: Asset[]; asOf: number };

export default function MarketPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [strats, setStrats] = useState<Strategy[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch("/api/prices", { cache: "no-store" });
        const j = await r.json();
        if (!stop) {
          setData(j);
          setErr(j.error ?? null);
        }
      } catch (e: unknown) {
        if (!stop) setErr(e instanceof Error ? e.message : "Failed to load prices");
      }
    };
    load();
    const id = setInterval(load, 12_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    setStrats(loadStrategies(wallet));
    setActs(loadActivity(wallet));
  }, [wallet]);

  const qmap = useMemo(() => {
    const m = new Map<string, PriceQuote>();
    for (const q of data?.quotes ?? []) m.set(q.symbol, q);
    return m;
  }, [data]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-[1.4fr_1fr] items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8b919b] mb-2">StockPilot</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
            Programmable trading
            <br />
            for tokenized stocks.
          </h1>
          <p className="mt-3 text-[#8b919b] max-w-xl">
            Describe a rule in English. Pyth watches the market vs the cash print. You sign the Solana trade.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Pyth", "Market vs reference"],
            ["Solana", "Wallet-signed txs"],
            ["PreStocks", "Pre-IPO marks"],
          ].map(([k, v]) => (
            <div key={k} className="panel p-3">
              <div className="text-[11px] uppercase tracking-widest text-[#8b919b]">{k}</div>
              <div className="text-sm mt-1">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {err && (
        <div className="panel p-3 text-sm text-[#f07178]">
          Price feed issue: {err}. UI stays up — retrying.
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm uppercase tracking-widest text-[#8b919b]">xStocks · Pyth dual feed</h2>
          <span className="text-[11px] text-[#8b919b] mono">
            {data?.asOf ? new Date(data.asOf).toLocaleTimeString() : "loading"}
          </span>
        </div>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-widest text-[#8b919b] border-b border-white/8">
              <tr>
                <th className="text-left font-medium px-4 py-2">Asset</th>
                <th className="text-right font-medium px-4 py-2">Market (xStock)</th>
                <th className="text-right font-medium px-4 py-2 hidden sm:table-cell">Reference (equity)</th>
                <th className="text-right font-medium px-4 py-2">Prem / Disc</th>
              </tr>
            </thead>
            <tbody>
              {XSTOCKS.map((a) => {
                const q = qmap.get(a.symbol);
                const pd = q?.premiumDiscountPct;
                return (
                  <tr key={a.symbol} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <Link href={`/stocks/${a.symbol}`} className="hover:underline">
                        <span className="font-medium">{a.symbol}</span>
                        <span className="text-[#8b919b] ml-2 hidden sm:inline">{a.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right mono">{fmtUsd(q?.marketPrice)}</td>
                    <td className="px-4 py-3 text-right mono hidden sm:table-cell text-[#8b919b]">
                      {fmtUsd(q?.referencePrice)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right mono",
                        pd != null && pd < 0 ? "down" : pd != null && pd > 0 ? "up" : ""
                      )}
                    >
                      {fmtPct(pd)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm uppercase tracking-widest text-[#8b919b]">PreStocks · pre-IPO</h2>
          <span className="text-[11px] text-[#8b919b]">mark vs token (PreStocks API)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(data?.prestocks ?? []).slice(0, 8).map((a) => {
            const q = qmap.get(a.symbol);
            const pd = q?.premiumDiscountPct;
            return (
              <Link key={a.symbol} href={`/stocks/${a.symbol}`} className="panel p-4 hover:border-white/20 transition-colors">
                <div className="text-[11px] uppercase tracking-widest text-[#8b919b]">PreStocks</div>
                <div className="mt-1 font-medium">{a.symbol}</div>
                <div className="text-xs text-[#8b919b]">{a.name}</div>
                <div className="mt-3 flex justify-between items-end">
                  <div className="mono text-lg">{fmtUsd(q?.marketPrice, 0)}</div>
                  <div className={cn("mono text-sm", pd != null && pd < 0 ? "down" : "up")}>{fmtPct(pd)}</div>
                </div>
                <div className="text-[11px] text-[#8b919b] mt-1">mark {fmtUsd(q?.referencePrice, 0)}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <div className="text-[11px] uppercase tracking-widest text-[#8b919b]">Active strategies</div>
          <div className="text-3xl font-semibold mt-1">{strats.filter((s) => s.status === "ACTIVE").length}</div>
          <Link href="/agents" className="text-xs text-[#c8f542] mt-2 inline-block">
            Manage agents →
          </Link>
        </div>
        <div className="panel p-4">
          <div className="text-[11px] uppercase tracking-widest text-[#8b919b]">Wallet</div>
          <div className="text-sm mt-2">{wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "Not connected"}</div>
          <Link href="/terminal" className="text-xs text-[#c8f542] mt-2 inline-block">
            Create a strategy →
          </Link>
        </div>
        <div className="panel p-4">
          <div className="text-[11px] uppercase tracking-widest text-[#8b919b]">Recent activity</div>
          <div className="text-3xl font-semibold mt-1">{acts.length}</div>
          <Link href="/activity" className="text-xs text-[#c8f542] mt-2 inline-block">
            History →
          </Link>
        </div>
      </section>
    </div>
  );
}
