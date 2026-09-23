"use client";

import { useMemo, useState } from "react";
import { EQUITY_CURVE, priceAlongCurve } from "@/lib/meteora";
import { fmtUsd } from "@/lib/format";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * STOCKLANA / Meteora DBC bounty surface.
 * This is an issuer tool: configure an equity-style DBC, not a meme launchpad.
 * Creating a live pool needs a partner config + mainnet tx — we do not fake one.
 */
export default function LaunchPage() {
  const p = EQUITY_CURVE;
  const [progress, setProgress] = useState(0.35);
  const chart = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const t = i / 20;
        return { t: `${Math.round(t * 100)}%`, price: priceAlongCurve(t, p) };
      }),
    [p]
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-[#8b919b]">Meteora DBC · issuer</p>
        <h1 className="text-3xl font-semibold tracking-tight">Equity curve, not a meme curve.</h1>
        <p className="text-[#8b919b] mt-2 text-sm">
          DBC is a launch primitive. StockPilot uses it for tokenized-stock discovery: USDC quote, flatter
          ramp, higher graduation, leftover vesting. We will not pretend a pool exists.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat k="Quote" v="USDC" />
        <Stat k="Start → end" v={`${fmtUsd(p.startPrice, 2)} → ${fmtUsd(p.endPrice, 2)}`} />
        <Stat k="Graduation" v={fmtUsd(p.graduationNotionalUsd, 0)} />
        <Stat k="Trade fee" v={`${(p.tradeFeeBps / 100).toFixed(2)}%`} />
        <Stat k="Leftover" v={`${p.leftoverPercent}% vested`} />
        <Stat k={`Price @ ${Math.round(progress * 100)}%`} v={fmtUsd(priceAlongCurve(progress, p))} />
      </div>

      <div className="panel p-4 h-56">
        <div className="text-[11px] uppercase tracking-widest text-[#8b919b] mb-2">
          Discovery curve (log ramp)
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={chart}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#0e1014", border: "1px solid rgba(255,255,255,0.1)" }}
              formatter={(v) => fmtUsd(typeof v === "number" ? v : Number(v))}
            />
            <Area type="monotone" dataKey="price" stroke="#c8f542" fill="#c8f54222" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <label className="block text-sm text-[#8b919b]">
        Simulated fill progress
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full mt-2"
        />
      </label>

      <ul className="panel p-4 text-sm space-y-2 text-[#cfd3d8]">
        {p.notes.map((n) => (
          <li key={n} className="pl-3 border-l border-[#c8f542]/40">
            {n}
          </li>
        ))}
      </ul>

      <p className="text-xs text-[#8b919b]">
        Live <code>createPool</code> is gated on a Meteora partner config account. SDK:{" "}
        <a className="text-[#c8f542]" href="https://docs.meteora.ag/developer-guides/dbc" target="_blank" rel="noreferrer">
          docs.meteora.ag/developer-guides/dbc
        </a>
        . Keepers already migrate Stock Token quote pairs to DAMM v2.
      </p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="panel p-3">
      <div className="text-[11px] uppercase tracking-widest text-[#8b919b]">{k}</div>
      <div className="mt-1 font-medium">{v}</div>
    </div>
  );
}
