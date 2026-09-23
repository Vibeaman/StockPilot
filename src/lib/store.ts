import type { Activity, PaperFill, Strategy } from "./types";

const SK = "sp_strategies";
const AK = "sp_activity";
const PK = "sp_paper_fills";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadStrategies(wallet?: string | null): Strategy[] {
  const all = read<Strategy[]>(SK, []);
  return wallet ? all.filter((s) => s.wallet === wallet) : all;
}

export function saveStrategy(s: Strategy) {
  const all = read<Strategy[]>(SK, []);
  const i = all.findIndex((x) => x.id === s.id);
  if (i >= 0) all[i] = s;
  else all.unshift(s);
  write(SK, all);
}

export function deleteStrategy(id: string) {
  write(
    SK,
    read<Strategy[]>(SK, []).filter((s) => s.id !== id)
  );
}

export function loadActivity(wallet?: string | null): Activity[] {
  const all = read<Activity[]>(AK, []);
  return wallet ? all.filter((a) => a.wallet === wallet) : all;
}

export function saveActivity(a: Activity) {
  const all = read<Activity[]>(AK, []);
  all.unshift(a);
  write(AK, all.slice(0, 200));
}

export function loadPaperFills(wallet?: string | null): PaperFill[] {
  const all = read<PaperFill[]>(PK, []);
  return wallet ? all.filter((f) => f.wallet === wallet) : all;
}

export function savePaperFill(f: PaperFill) {
  const all = read<PaperFill[]>(PK, []);
  all.unshift(f);
  write(PK, all.slice(0, 200));
}

export function deletePaperFill(id: string) {
  write(
    PK,
    read<PaperFill[]>(PK, []).filter((f) => f.id !== id)
  );
}
