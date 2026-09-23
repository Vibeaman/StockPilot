"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { XSTOCKS } from "@/lib/assets";
import { fmtPct, fmtUsd, cn } from "@/lib/format";
import { loadActivity, loadStrategies } from "@/lib/store";
import type { Activity, Asset, PriceQuote, Strategy } from "@/lib/types";

type Payload = {
  quotes: PriceQuote[];
  prestocks: Asset[];
  asOf: number;
  pythLive?: number;
  pythConfigured?: boolean;
};

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

  const active = strats.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#14f195]">
          ◆ Pyth dual feed ◆ PreStocks ◆ Meteora DBC
        </p>
        <h1 className="display text-4xl md:text-6xl font-semibold leading-[0.95]">
          StockPilot_
        </h1>
        <p className="text-lg md:text-xl text-[#c9c4de] max-w-2xl">
          The stock market is open for building.
          <br />
          Programmable trading for tokenized stocks on Solana.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/terminal" className="btn-primary px-5 py-2.5">
            Launch terminal →
          </Link>
          <Link href="/launch" className="px-5 py-2.5 text-sm border border-[rgba(153,69,255,0.35)] text-[#c9c4de]">
            Equity curve
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[rgba(153,69,255,0.18)] panel overflow-hidden">
          <HeroStat k="Active rules" v={String(active)} />
          <HeroStat k="xStocks" v={String(XSTOCKS.length)} />
          <HeroStat k="Pre-IPO" v={String((data?.prestocks ?? []).length || "—")} />
          <HeroStat k="Signed txs" v={String(acts.length)} />
        </div>
      </section>

      {err && (
        <div className="panel p-3 text-sm text-[#ff6b8a]">
          Price feed issue: {err}. UI stays up — retrying.
        </div>
      )}
      {data && (data.pythLive ?? 0) === 0 && (
        <div className="panel p-3 text-sm text-[#9a96b0]">
          xStock quotes are empty. Set <span className="mono">PYTH_API_KEY</span> on Vercel
          (the Bearer token only) and Redeploy. PreStocks below still load without a key.
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm uppercase tracking-widest text-[#9a96b0]">xStocks · Pyth dual feed</h2>
          <span className="text-[11px] text-[#9a96b0] mono">
            {data?.asOf ? new Date(data.asOf).toLocaleTimeString() : "loading"}
          </span>
        </div>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-widest text-[#9a96b0] border-b border-[rgba(153,69,255,0.18)]">
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
                        <span className="text-[#9a96b0] ml-2 hidden sm:inline">{a.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right mono">{fmtUsd(q?.marketPrice)}</td>
                    <td className="px-4 py-3 text-right mono hidden sm:table-cell text-[#9a96b0]">
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
          <h2 className="text-sm uppercase tracking-widest text-[#9a96b0]">PreStocks · pre-IPO</h2>
          <span className="text-[11px] text-[#9a96b0]">mark vs token (PreStocks API)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(data?.prestocks ?? []).slice(0, 8).map((a) => {
            const q = qmap.get(a.symbol);
            const pd = q?.premiumDiscountPct;
            return (
              <Link key={a.symbol} href={`/stocks/${a.symbol}`} className="panel p-4 hover:border-[rgba(153,69,255,0.4)] transition-colors">
                <div className="text-[11px] uppercase tracking-widest text-[#9a96b0]">PreStocks</div>
                <div className="mt-1 font-medium">{a.symbol}</div>
                <div className="text-xs text-[#9a96b0]">{a.name}</div>
                <div className="mt-3 flex justify-between items-end">
                  <div className="mono text-lg">{fmtUsd(q?.marketPrice, 0)}</div>
                  <div className={cn("mono text-sm", pd != null && pd < 0 ? "down" : "up")}>{fmtPct(pd)}</div>
                </div>
                <div className="text-[11px] text-[#9a96b0] mt-1">mark {fmtUsd(q?.referencePrice, 0)}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <div className="text-[11px] uppercase tracking-widest text-[#9a96b0]">Wallet</div>
          <div className="text-sm mt-2">{wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "Not connected"}</div>
          <Link href="/terminal" className="text-xs text-[#14f195] mt-2 inline-block">
            Create a strategy →
          </Link>
        </div>
        <div className="panel p-4">
          <div className="text-[11px] uppercase tracking-widest text-[#9a96b0]">Active strategies</div>
          <div className="display text-3xl font-semibold mt-1">{active}</div>
          <Link href="/agents" className="text-xs text-[#14f195] mt-2 inline-block">
            Manage agents →
          </Link>
        </div>
        <div className="panel p-4">
          <div className="text-[11px] uppercase tracking-widest text-[#9a96b0]">Recent activity</div>
          <div className="display text-3xl font-semibold mt-1">{acts.length}</div>
          <Link href="/activity" className="text-xs text-[#14f195] mt-2 inline-block">
            History →
          </Link>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-[#05030a] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#9a96b0]">{k}</div>
      <div className="display text-2xl mt-1">{v}</div>
    </div>
  );
}
