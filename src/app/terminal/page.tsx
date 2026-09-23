"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { findAsset } from "@/lib/assets";
import { describeCondition, evaluate, defaultName } from "@/lib/strategy";
import { saveActivity, saveStrategy } from "@/lib/store";
import { fmtUsd } from "@/lib/format";
import { quoteSwap, deserializeSwapTx, USDC_MINT } from "@/lib/jupiter";
import type { ParsedStrategy, PriceQuote, Strategy } from "@/lib/types";
import { explorerTx } from "@/lib/format";

const EXAMPLE = "Buy $100 of NVDA if it falls 2% below its reference price.";

export default function TerminalPage() {
  const params = useSearchParams();
  const preset = params.get("asset");
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const wallet = publicKey?.toBase58() ?? "";

  const [prompt, setPrompt] = useState(
    preset ? `Buy $100 of ${preset} if it falls 2% below its reference price.` : EXAMPLE
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [draft, setDraft] = useState<ParsedStrategy | null>(null);
  const [quotes, setQuotes] = useState<PriceQuote[]>([]);
  const [demo, setDemo] = useState(false);
  const [signal, setSignal] = useState<{ reason: string; strategy: Strategy } | null>(null);
  const [txNote, setTxNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/prices", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setQuotes(j.quotes ?? []))
      .catch(() => {});
  }, []);

  const qmap = useMemo(() => {
    const m = new Map<string, PriceQuote>();
    for (const q of quotes) m.set(q.symbol, q);
    return m;
  }, [quotes]);

  async function onParse(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setHint(null);
    setDraft(null);
    setSignal(null);
    setTxNote(null);
    try {
      const r = await fetch("/api/strategy/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const j = await r.json();
      if (j.error) {
        setErr(j.error);
        setHint(j.hint ?? null);
      } else {
        setDraft(j);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    if (!draft) return;
    if (!wallet) {
      setErr("Connect a wallet to save a strategy. The AI never signs.");
      return;
    }
    const s: Strategy = {
      ...draft,
      id: crypto.randomUUID(),
      wallet,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: defaultName(draft),
    };
    saveStrategy(s);
    setTxNote(`Saved ${s.name}. It will not trade until the condition hits and you sign.`);
  }

  function fireDemo() {
    if (!draft) return;
    if (!wallet) {
      setErr("Connect a wallet first.");
      return;
    }
    const live = qmap.get(draft.asset);
    const simulated: PriceQuote = {
      symbol: draft.asset,
      marketPrice:
        draft.conditionType === "PRICE_BELOW_REFERENCE" && live?.referencePrice
          ? live.referencePrice * ((draft.referenceMultiplier ?? 0.98) - 0.005)
          : live?.marketPrice ?? 100,
      referencePrice: live?.referencePrice ?? 100,
      premiumDiscountPct: null,
      source: "demo",
    };
    const ev = evaluate(draft, simulated);
    const s: Strategy = {
      ...draft,
      id: crypto.randomUUID(),
      wallet,
      status: ev.triggered ? "TRIGGERED" : "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: defaultName(draft),
      lastTriggerReason: ev.reason,
    };
    saveStrategy(s);
    if (ev.triggered) setSignal({ reason: ev.reason, strategy: s });
    else setTxNote(`Demo did not trip: ${ev.reason}`);
  }

  async function execute(s: Strategy) {
    setBusy(true);
    setErr(null);
    try {
      const asset = findAsset(s.asset, []);
      if (!asset || asset.kind !== "xstock") {
        throw new Error("Live swaps in this MVP are xStocks (NVDA/AAPL/TSLA/MSFT) via Jupiter. PreStocks stay as alerts.");
      }
      if (!publicKey) throw new Error("Wallet not connected");
      if (s.action === "ALERT") {
        saveActivity({
          id: crypto.randomUUID(),
          wallet,
          strategyId: s.id,
          asset: s.asset,
          action: "ALERT",
          amount: s.amount,
          status: "SUCCESS",
          createdAt: new Date().toISOString(),
          note: "Alert only — no swap",
        });
        setTxNote("Alert recorded. No transaction sent.");
        return;
      }
      const buy = s.action === "BUY";
      const q = await quoteSwap({
        inputMint: buy ? USDC_MINT : asset.mint,
        outputMint: buy ? asset.mint : USDC_MINT,
        amount: s.amount,
        decimals: buy ? 6 : asset.decimals,
        taker: publicKey.toBase58(),
      });
      if (q.error || !q.transaction) {
        throw new Error(q.error || "Jupiter did not return a transaction. The pair may have no route.");
      }
      const tx = deserializeSwapTx(q.transaction);
      const sig = await sendTransaction(tx, connection);
      saveActivity({
        id: crypto.randomUUID(),
        wallet,
        strategyId: s.id,
        asset: s.asset,
        action: s.action,
        amount: s.amount,
        signature: sig,
        status: "SUCCESS",
        createdAt: new Date().toISOString(),
      });
      const done = { ...s, status: "TRIGGERED" as const, updatedAt: new Date().toISOString() };
      saveStrategy(done);
      setTxNote(`Submitted ${sig}`);
      setSignal(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setBusy(false);
    }
  }

  const previewQ = draft ? qmap.get(draft.asset) : undefined;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#8b919b]">AI strategy terminal</p>
        <h1 className="text-3xl font-semibold tracking-tight">What do you want StockPilot to do?</h1>
        <p className="text-[#8b919b] mt-2 text-sm">
          The model only returns a validated rule. It cannot sign. Execution is wallet-approved.
        </p>
      </div>

      <form onSubmit={onParse} className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full panel p-4 text-base bg-transparent outline-none focus:border-white/30"
        />
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            className="px-4 py-2 bg-[#c8f542] text-black text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Parsing…" : "Create strategy"}
          </button>
          <button
            type="button"
            onClick={() => setPrompt(EXAMPLE)}
            className="px-4 py-2 panel text-sm"
          >
            Example
          </button>
        </div>
      </form>

      {err && (
        <div className="panel p-4 text-sm">
          <div className="text-[#f07178]">{err}</div>
          {hint && <div className="text-[#8b919b] mt-1">{hint}</div>}
        </div>
      )}

      {draft && (
        <div className="panel p-5 space-y-4">
          <div className="text-[11px] uppercase tracking-widest text-[#8b919b]">Strategy preview</div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Row k="Asset" v={draft.asset} />
            <Row k="Action" v={draft.action} />
            <Row k="Amount" v={fmtUsd(draft.amount, 0)} />
            <Row k="Condition" v={describeCondition(draft)} />
            <Row k="Live market" v={fmtUsd(previewQ?.marketPrice)} />
            <Row k="Live reference" v={fmtUsd(previewQ?.referencePrice)} />
          </dl>
          <label className="flex items-center gap-2 text-sm text-[#8b919b]">
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
            Demo mode — simulate a trigger even if the live market has not dipped
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={confirm} className="px-4 py-2 bg-white text-black text-sm font-medium">
              Confirm strategy
            </button>
            {demo && (
              <button onClick={fireDemo} className="px-4 py-2 panel text-sm">
                Simulate trigger
              </button>
            )}
          </div>
        </div>
      )}

      {signal && (
        <div className="panel p-5 space-y-3 border-[#c8f542]/40">
          <div className="text-[11px] uppercase tracking-widest text-[#c8f542]">Signal detected</div>
          <p className="text-sm">{signal.reason}</p>
          <p className="text-xs text-[#8b919b]">
            Review, then approve in your wallet. Nothing broadcasts until you sign.
          </p>
          <button
            disabled={busy || !connected}
            onClick={() => execute(signal.strategy)}
            className="px-4 py-2 bg-[#c8f542] text-black text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Waiting on wallet…" : `Review ${signal.strategy.action} ${fmtUsd(signal.strategy.amount, 0)} ${signal.strategy.asset}`}
          </button>
        </div>
      )}

      {txNote && (
        <div className="text-sm text-[#8b919b]">
          {txNote.startsWith("Submitted") ? (
            <a className="text-[#c8f542]" href={explorerTx(txNote.replace("Submitted ", ""))} target="_blank" rel="noreferrer">
              View on Solscan →
            </a>
          ) : (
            txNote
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-[#8b919b]">{k}</dt>
      <dd className="mt-0.5">{v}</dd>
    </div>
  );
}
