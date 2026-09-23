export function fmtUsd(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const v = abs;
  if (v >= 1e12) return `${sign}$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${sign}$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${sign}$${(v / 1e3).toFixed(1)}K`;
  return fmtUsd(n, 0);
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function shortAddr(a: string, n = 4): string {
  if (!a) return "";
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

export function explorerTx(sig: string): string {
  return `https://solscan.io/tx/${sig}`;
}

export function explorerToken(mint: string): string {
  return `https://solscan.io/token/${mint}`;
}

export function cn(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}
