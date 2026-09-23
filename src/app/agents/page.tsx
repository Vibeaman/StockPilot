"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { deleteStrategy, loadStrategies, saveStrategy } from "@/lib/store";
import { describeCondition } from "@/lib/strategy";
import { fmtUsd, cn } from "@/lib/format";
import type { Strategy } from "@/lib/types";

export default function AgentsPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const [list, setList] = useState<Strategy[]>([]);

  function refresh() {
    setList(loadStrategies(wallet));
  }
  useEffect(refresh, [wallet]);

  function setStatus(s: Strategy, status: Strategy["status"]) {
    saveStrategy({ ...s, status, updatedAt: new Date().toISOString() });
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#8b919b]">Stock Agents</p>
          <h1 className="text-3xl font-semibold tracking-tight">Saved rules. Not autonomous traders.</h1>
        </div>
        <Link href="/terminal" className="px-4 py-2 bg-[#c8f542] text-black text-sm font-medium">
          New strategy
        </Link>
      </div>

      {!wallet && <p className="text-[#8b919b] text-sm">Connect a wallet to see agents bound to it.</p>}

      <div className="grid gap-3">
        {list.length === 0 && wallet && (
          <div className="panel p-8 text-[#8b919b] text-sm">No agents yet.</div>
        )}
        {list.map((s) => (
          <div key={s.id} className="panel p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.name ?? `${s.asset} ${s.action}`}</span>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-widest px-2 py-0.5 border",
                    s.status === "ACTIVE"
                      ? "text-[#3dd68c] border-[#3dd68c]/40"
                      : s.status === "TRIGGERED"
                      ? "text-[#c8f542] border-[#c8f542]/40"
                      : "text-[#8b919b] border-white/15"
                  )}
                >
                  {s.status}
                </span>
              </div>
              <div className="text-sm text-[#8b919b] mt-1">
                {s.action} {fmtUsd(s.amount, 0)} {s.asset} · {describeCondition(s)}
              </div>
            </div>
            <div className="flex gap-2 text-sm">
              {s.status === "ACTIVE" ? (
                <button onClick={() => setStatus(s, "PAUSED")} className="px-3 py-1.5 panel">
                  Pause
                </button>
              ) : (
                <button onClick={() => setStatus(s, "ACTIVE")} className="px-3 py-1.5 panel">
                  Resume
                </button>
              )}
              <button
                onClick={() => {
                  deleteStrategy(s.id);
                  refresh();
                }}
                className="px-3 py-1.5 panel text-[#f07178]"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
