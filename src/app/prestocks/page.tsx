"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { fmtCompact, fmtPct, fmtUsd, cn, explorerToken, shortAddr } from "@/lib/format";
import { loadPaperFills, savePaperFill, deletePaperFill } from "@/lib/store";
import { convergencePnl } from "@/lib/strategy";
import type { Asset, PaperFill, PriceQuote } from "@/lib/types";

type Payload = {
  quotes: PriceQuote[];
  prestocks: Asset[];
  asOf: number;
};

const NOTIONALS = [100, 250, 500, 1000];

export default function PreStocksDesk() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "anon";
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fills, setFills] = useState<PaperFill[]>([]);
  const [notional, setNotional] = useState(250);
  const [note, setNote] = useState<string | null>(null);

  function refreshFills() {
    setFills(loadPaperFills(wallet === "anon" ? null : wallet).filter((f) => f.wallet === wallet));
  }

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch("/api/prices", { cache: "no-store" });
        const j = await r.json();
        if (stop) return;
        setData({
          quotes: (j.quotes ?? []).filter((q: PriceQuote) => q.source === "prestocks"),
          prestocks: j.prestocks ?? [],
          asOf: j.asOf,
        });
        setErr(j.error ?? null);
      } catch (e: unknown) {
        if (!stop) setErr(e instanceof Error ? e.message : "Failed to load PreStocks");
      }
    };
    load();
    const id = setInterval(load, 12_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  useEffect(refreshFills, [wallet]);

  const qmap = useMemo(() => {
    const m = new Map<string, PriceQuote>();
    for (const q of data?.quotes ?? []) m.set(q.symbol, q);
    return m;
  }, [data]);

  const board = useMemo(() => {
    const rows = (data?.prestocks ?? []).map((a) => {
      const q = qmap.get(a.symbol);
      const pd = q?.premiumDiscountPct ?? null;
      return { asset: a, quote: q, pd };
    });
    rows.sort((a, b) => Math.abs(b.pd ?? 0) - Math.abs(a.pd ?? 0));
    return rows;
  }, [data, qmap]);

  const cheapest = board.filter((r) => (r.pd ?? 0) < 0);
  const richest = board.filter((r) => (r.pd ?? 0) > 0);

  function paper(asset: Asset, side: "BUY" | "SELL") {
    const q = qmap.get(asset.symbol);
    if (!q?.marketPrice || !q.referencePrice) {
      setNote("No live PreStocks quote for that name.");
      return;
    }
    const fill: PaperFill = {
      id: crypto.randomUUID(),
      wallet,
      symbol: asset.symbol,
      name: asset.name,
      side,
      notionalUsd: notional,
      tokenPrice: q.marketPrice,
      markPrice: q.referencePrice,
      premiumDiscountPct: q.premiumDiscountPct,
      createdAt: new Date().toISOString(),
    };
    savePaperFill(fill);
    refreshFills();
    setNote(
      `${side} ${fmtUsd(notional, 0)} ${asset.symbol} paper @ token ${fmtUsd(q.marketPrice)} vs mark ${fmtUsd(q.referencePrice)}.`
    );
  }

  const book = fills.map((f) => {
    const q = qmap.get(f.symbol);
    const pnl = convergencePnl({
      side: f.side,
      notionalUsd: f.notionalUsd,
      entryToken: f.tokenPrice,
      liveToken: q?.marketPrice ?? null,
      liveMark: q?.referencePrice ?? null,
    });
    return { fill: f, pnl };
  });
  const toMarkSum = book.reduce((s, r) => s + (r.pnl.toMark ?? 0), 0);
  const mtmSum = book.reduce((s, r) => s + (r.pnl.markToMarket ?? 0), 0);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#14f195]">
          PreStocks only · no xStocks · no other pre-IPO tokens
        </p>
        <h1 className="display text-4xl md:text-5xl font-semibold leading-[0.95]">
          Mark desk_
        </h1>
        <p className="text-lg text-[#c9c4de] max-w-2xl">
          PreStocks tokens track an SPV mark. When the token trades away from that mark, the gap is a
          convergence trade — buy the discount, fade the premium. Paper fills only: Jupiter does not
          route these mints.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[rgba(153,69,255,0.18)] panel overflow-hidden">
          <Hero k="Names" v={String(board.length || "—")} />
          <Hero k="Widest gap" v={board[0] ? `${board[0].asset.symbol} ${fmtPct(board[0].pd)}` : "—"} />
          <Hero k="Paper P&L → mark" v={fmtUsd(toMarkSum)} className={toMarkSum < 0 ? "down" : "up"} />
          <Hero k="Mark-to-market" v={fmtUsd(mtmSum)} className={mtmSum < 0 ? "down" : "up"} />
        </div>
      </section>

      {err && (
        <div className="panel p-3 text-sm text-[#ff6b8a]">
          PreStocks feed issue: {err}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <Idea
          title="Buy the discount"
          body="Token below SPV mark. Paper-buy; P&L is the close of that gap."
          names={cheapest.slice(0, 3).map((r) => `${r.asset.symbol} ${fmtPct(r.pd)}`)}
        />
        <Idea
          title="Fade the premium"
          body="Token above SPV mark. Paper-sell; P&L is mean reversion to mark."
          names={richest.slice(0, 3).map((r) => `${r.asset.symbol} ${fmtPct(r.pd)}`)}
        />
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#9a96b0]">Spread board</h2>
            <p className="text-[11px] text-[#9a96b0] mt-1">
              Live from prestocks.com/api/prestocks ·{" "}
              {data?.asOf ? new Date(data.asOf).toLocaleTimeString() : "loading"}
            </p>
          </div>
          <label className="text-xs text-[#9a96b0] flex items-center gap-2">
            Paper size
            <select
              value={notional}
              onChange={(e) => setNotional(Number(e.target.value))}
              className="bg-[#05030a] border border-[rgba(153,69,255,0.35)] px-2 py-1 text-[#f4f1ff]"
            >
              {NOTIONALS.map((n) => (
                <option key={n} value={n}>
                  {fmtUsd(n, 0)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="panel overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-widest text-[#9a96b0] border-b border-[rgba(153,69,255,0.18)]">
                <tr>
                  <th className="text-left font-medium px-4 py-2">PreStock</th>
                  <th className="text-right font-medium px-4 py-2">Token</th>
                  <th className="text-right font-medium px-4 py-2 hidden sm:table-cell">SPV mark</th>
                  <th className="text-right font-medium px-4 py-2">Gap</th>
                  <th className="text-right font-medium px-4 py-2 hidden md:table-cell">Implied val</th>
                  <th className="text-right font-medium px-4 py-2 hidden md:table-cell">Mark val</th>
                  <th className="text-right font-medium px-4 py-2">Paper</th>
                </tr>
              </thead>
              <tbody>
                {board.map(({ asset, quote, pd }) => {
                  const discount = (pd ?? 0) < 0;
                  return (
                    <tr key={asset.symbol} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <Link href={`/stocks/${asset.symbol}`} className="hover:underline">
                          <span className="font-medium">{asset.symbol}</span>
                          <span className="text-[#9a96b0] ml-2 hidden sm:inline">{asset.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right mono">{fmtUsd(quote?.marketPrice)}</td>
                      <td className="px-4 py-3 text-right mono hidden sm:table-cell text-[#9a96b0]">
                        {fmtUsd(quote?.referencePrice)}
                      </td>
                      <td className={cn("px-4 py-3 text-right mono", discount ? "down" : pd != null ? "up" : "")}>
                        {fmtPct(pd)}
                      </td>
                      <td className="px-4 py-3 text-right mono hidden md:table-cell text-[#9a96b0]">
                        {fmtCompact(asset.impliedValuation)}
                      </td>
                      <td className="px-4 py-3 text-right mono hidden md:table-cell text-[#9a96b0]">
                        {fmtCompact(asset.markValuation)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => paper(asset, "BUY")}
                            className="px-2 py-1 text-[11px] uppercase tracking-widest border border-[rgba(20,241,149,0.35)] text-[#14f195]"
                          >
                            Buy
                          </button>
                          <button
                            onClick={() => paper(asset, "SELL")}
                            className="px-2 py-1 text-[11px] uppercase tracking-widest border border-[rgba(255,107,138,0.35)] text-[#ff6b8a]"
                          >
                            Sell
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {board.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-[#9a96b0] text-sm">
                      Waiting on prestocks.com…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {note && <p className="text-xs text-[#9a96b0] mt-2">{note}</p>}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm uppercase tracking-widest text-[#9a96b0]">Paper book</h2>
          <span className="text-[11px] text-[#9a96b0]">
            P&L → mark assumes the token prints the SPV. MTM uses live token.
          </span>
        </div>
        {book.length === 0 ? (
          <div className="panel p-6 text-sm text-[#9a96b0]">
            No paper fills yet. Buy a name trading below mark, or sell one trading above it.
          </div>
        ) : (
          <div className="grid gap-3">
            {book.map(({ fill, pnl }) => (
              <div key={fill.id} className="panel p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] uppercase tracking-widest", fill.side === "BUY" ? "up" : "down")}>
                      {fill.side}
                    </span>
                    <span className="font-medium">{fill.symbol}</span>
                    <span className="text-[#9a96b0] text-sm">{fmtUsd(fill.notionalUsd, 0)}</span>
                  </div>
                  <div className="text-[11px] text-[#9a96b0] mt-1 mono">
                    in @ {fmtUsd(fill.tokenPrice)} vs mark {fmtUsd(fill.markPrice)} ({fmtPct(fill.premiumDiscountPct)})
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Pnl k="→ mark" v={pnl.toMark} />
                  <Pnl k="MTM" v={pnl.markToMarket} />
                  <button
                    onClick={() => {
                      deletePaperFill(fill.id);
                      refreshFills();
                    }}
                    className="text-[11px] text-[#9a96b0] hover:text-[#ff6b8a]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5 space-y-3">
          <h2 className="text-sm uppercase tracking-widest text-[#9a96b0]">Rule on a PreStock</h2>
          <p className="text-sm text-[#c9c4de]">
            Same language as the terminal. PreStocks stay alerts — we will not invent a Jupiter signature.
          </p>
          <div className="flex flex-wrap gap-2">
            {["SPACEX", "OPENAI", "ANDURIL"].map((s) => (
              <Link
                key={s}
                href={`/terminal?asset=${s}`}
                className="px-3 py-1.5 text-xs border border-[rgba(153,69,255,0.35)] hover:border-[#14f195]"
              >
                Watch {s} →
              </Link>
            ))}
          </div>
        </div>
        <div className="panel p-5 space-y-2 text-sm">
          <h2 className="text-sm uppercase tracking-widest text-[#9a96b0]">Eligibility</h2>
          <p className="text-[#c9c4de]">
            This desk only lists tokens from{" "}
            <a className="text-[#14f195]" href="https://prestocks.com/api/prestocks" target="_blank" rel="noreferrer">
              prestocks.com/api/prestocks
            </a>
            . No Tessera, no other pre-IPO wrappers.
          </p>
          <p className="text-[11px] text-[#9a96b0]">
            Paper P&L is a simulation. Tokenized pre-IPO is not the private share. Not financial advice.
          </p>
          {board[0] && (
            <a
              className="text-[11px] text-[#14f195] mono inline-block"
              href={explorerToken(board[0].asset.mint)}
              target="_blank"
              rel="noreferrer"
            >
              {board[0].asset.symbol} mint {shortAddr(board[0].asset.mint, 6)}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

function Hero({ k, v, className }: { k: string; v: string; className?: string }) {
  return (
    <div className="bg-[#05030a] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#9a96b0]">{k}</div>
      <div className={cn("display text-xl mt-1", className)}>{v}</div>
    </div>
  );
}

function Idea({ title, body, names }: { title: string; body: string; names: string[] }) {
  return (
    <div className="panel p-5 space-y-2">
      <h2 className="text-sm uppercase tracking-widest text-[#9a96b0]">{title}</h2>
      <p className="text-sm text-[#c9c4de]">{body}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {names.length === 0 && <span className="text-xs text-[#9a96b0]">No names on that side right now.</span>}
        {names.map((n) => (
          <span key={n} className="text-xs mono px-2 py-1 border border-[rgba(153,69,255,0.25)]">
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function Pnl({ k, v }: { k: string; v: number | null }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-widest text-[#9a96b0]">{k}</div>
      <div className={cn("mono", v != null && v < 0 ? "down" : v != null ? "up" : "")}>{fmtUsd(v)}</div>
    </div>
  );
}
