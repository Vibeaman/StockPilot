export function fmtUsd(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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
