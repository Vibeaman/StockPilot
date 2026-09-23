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
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080a]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-semibold tracking-tight">StockPilot</span>
            <span className="hidden sm:inline text-[11px] uppercase tracking-widest text-[#8b919b]">
              programmable stocks
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm overflow-x-auto">
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "px-3 py-1.5 rounded-full transition-colors",
                    active ? "text-white bg-white/8" : "text-[#8b919b] hover:text-white"
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <WalletMultiButton />
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-white/10 text-[11px] text-[#8b919b] px-4 py-4">
        <div className="mx-auto max-w-6xl flex flex-wrap gap-x-6 gap-y-1">
          <span>AI writes the rule. You sign the trade. Pyth decides when.</span>
          <span>Not financial advice.</span>
          <span>STOCKLANA · Pyth · PreStocks · Meteora DBC</span>
        </div>
      </footer>
    </div>
  );
}
