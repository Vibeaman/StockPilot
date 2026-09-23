"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/", label: "Market" },
  { href: "/terminal", label: "Terminal" },
  { href: "/agents", label: "Agents" },
  { href: "/launch", label: "Launch" },
  { href: "/activity", label: "Activity" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[rgba(153,69,255,0.18)] bg-[#05030a]/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-2.5 flex flex-col gap-2 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:py-0">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="display text-lg font-semibold tracking-tight">
                StockPilot<span className="text-[#14f195]">_</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#14f195]">
                <span className="live-dot" />
                Live
              </span>
            </Link>
            <div className="wallet-slot shrink-0">
              <WalletMultiButton />
            </div>
          </div>
          <nav className="flex items-center gap-1 text-sm overflow-x-auto no-scrollbar -mx-1 px-1">
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "px-3 py-1.5 rounded-full transition-colors whitespace-nowrap",
                    active
                      ? "text-white bg-[rgba(153,69,255,0.22)]"
                      : "text-[#9a96b0] hover:text-white"
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t border-[rgba(153,69,255,0.18)] text-[11px] text-[#9a96b0] px-4 py-5">
        <div className="mx-auto max-w-6xl flex flex-wrap gap-x-6 gap-y-1">
          <span>AI writes the rule. You sign the trade. Pyth decides when.</span>
          <span>Not financial advice.</span>
          <span>STOCKLANA · Pyth · PreStocks · Meteora DBC</span>
        </div>
      </footer>
    </div>
  );
}
