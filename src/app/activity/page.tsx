"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { loadActivity } from "@/lib/store";
import { explorerTx, fmtUsd, shortAddr } from "@/lib/format";
import type { Activity } from "@/lib/types";

export default function ActivityPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const [rows, setRows] = useState<Activity[]>([]);
  useEffect(() => setRows(loadActivity(wallet)), [wallet]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#8b919b]">Activity</p>
        <h1 className="text-3xl font-semibold tracking-tight">Signed trades only.</h1>
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-widest text-[#8b919b] border-b border-white/8">
            <tr>
              <th className="text-left font-medium px-4 py-2">Action</th>
              <th className="text-left font-medium px-4 py-2">Asset</th>
              <th className="text-right font-medium px-4 py-2">Amount</th>
              <th className="text-right font-medium px-4 py-2">Status</th>
              <th className="text-right font-medium px-4 py-2">Tx</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[#8b919b]">
                  No transactions yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="px-4 py-3">{r.action}</td>
                <td className="px-4 py-3">{r.asset}</td>
                <td className="px-4 py-3 text-right mono">{fmtUsd(r.amount, 0)}</td>
                <td className="px-4 py-3 text-right">{r.status}</td>
                <td className="px-4 py-3 text-right">
                  {r.signature ? (
                    <a className="text-[#c8f542]" href={explorerTx(r.signature)} target="_blank" rel="noreferrer">
                      {shortAddr(r.signature, 4)}
                    </a>
                  ) : (
                    <span className="text-[#8b919b]">{r.note ?? "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
