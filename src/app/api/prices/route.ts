import { NextResponse } from "next/server";
import { fetchPythQuotes } from "@/lib/pyth";
import { fetchPreStocks } from "@/lib/prestocks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [pyth, pre] = await Promise.all([
      fetchPythQuotes().catch((e) => {
        console.error("pyth", e);
        return [];
      }),
      fetchPreStocks().catch((e) => {
        console.error("prestocks", e);
        return { assets: [], quotes: [] };
      }),
    ]);
    const pythLive = pyth.filter((q) => q.marketPrice != null).length;
    return NextResponse.json({
      quotes: [...pyth, ...pre.quotes],
      prestocks: pre.assets,
      asOf: Date.now(),
      pythLive,
      pythConfigured: Boolean(process.env.PYTH_API_KEY),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "price fetch failed";
    return NextResponse.json({ error: msg, quotes: [], prestocks: [] }, { status: 500 });
  }
}
