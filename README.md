# StockPilot

**AI writes the rule. You sign the trade. Pyth decides when.**

Programmable trading for tokenized stocks on Solana. Built for [STOCKLANA](https://hackathons.solana.com/hackathons/stocklana).

Repo: https://github.com/Vibeaman/StockPilot

## What it is

You type:

> Buy $100 of NVDA if it falls 2% below its reference price.

A local parser (Gemini optional) turns that into a **validated, deterministic rule**. It cannot sign. When Pyth Pro says the xStock (`Crypto.NVDAX/USD`) is 2% under the cash print (`Equity.US.NVDA/USD`), you review and **your wallet** signs a Jupiter swap.

Stock Agents are saved rules — not Clawpump agents, not unrestricted LLM traders.

## Tracks

| Track | How we hit it |
|---|---|
| **Main** | End-to-end terminal: NL → rule → trigger → wallet-signed swap |
| **Pyth** | Dual feed on every xStock: market vs reference + live premium/discount |
| **PreStocks** | `/prestocks` mark desk: live token vs SPV mark, paper buy/sell of the gap, P&L if the token converges to mark. Same strategy language. No non-PreStocks pre-IPO tokens. |
| **Meteora DBC** | `/launch` — equity-style DBC preset (USDC quote, flatter curve, $250k graduation, leftover vesting). We do **not** fake a pool. |

Skipped: Tessera (conflicts with PreStocks DQ), Clawpump (different product).

## Demo (2–3 min)

1. Open the market. NVDA shows **market** (xStock, 24/7) vs **reference** (NYSE print) and the discount.
2. Terminal → paste the NVDA prompt → Create strategy.
3. Confirm. It appears under Agents.
4. Check **Demo mode** → Simulate trigger (live markets will not politely dip during judging).
5. Review → approve in Phantom → Solscan link on Activity.

## Stack

Next.js 15 · TypeScript · Tailwind 4 · Solana wallet adapter · local NL parser (Gemini optional) · Pyth Pro (`pyth.dourolabs.app`) · PreStocks public API · Jupiter Ultra · Meteora DBC preset (documented, not faked)

Persistence is **localStorage** keyed by wallet (no private keys). Swap in Supabase later if you want.

## Deploy on Vercel (this is the path)

1. Import **https://github.com/Vibeaman/StockPilot** into Vercel (Framework Preset: Next.js, Root Directory: `.`).
2. Add environment variables **before the first deploy**:

| Name | Required | Where to get it | Vercel environments |
|---|---|---|---|
| `PYTH_API_KEY` | **Yes for live prices** | Pyth Terminal — paste **only the Bearer token**, not the curl | Production, Preview, Development |
| `GEMINI_API_KEY` | No | Optional. Demo prompt works without it. | Production, Preview |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | No | Public mainnet is the default. Helius/Triton is better on demo day. | Production, Preview |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | No | `mainnet-beta` | Production |

Do **not** prefix `PYTH_API_KEY` or `GEMINI_API_KEY` with `NEXT_PUBLIC_`. Those stay on the server (`/api/prices`, `/api/strategy/parse`).

3. Deploy. Paste the `*.vercel.app` URL into the Stocklana submission.

No agent API key. No Jupiter key. No PreStocks key. No private keys.

## Integrations (honest)

- **Pyth Pro** — `GET /api/prices` hits `https://pyth.dourolabs.app/v1/fixed_rate@1000ms/history` with `Crypto.{TICKER}X/USD` vs `Equity.US.{TICKER}/USD`. Falls back to Hermes if Pro fails.
- **PreStocks** — public JSON, mark vs token price as reference/market. `/prestocks` is PreStocks-only: ranked spreads, paper fills, convergence P&L. No Jupiter signature is invented.
- **Jupiter Ultra** — `lite-api.jup.ag/ultra/v1/order` for USDC ↔ xStock. If there is no route, we surface the error. We never invent a signature.
- **Meteora DBC** — equity curve documented in `src/lib/meteora.ts`. Live `createPool` needs a partner config; the UI says so.
- **PreStocks swaps** — Jupiter Ultra does not route these mints. Terminal treats them as ALERT. The mark desk papers the spread instead of faking a tx.

## xStock mints (verify before trading)

| Ticker | Mint |
|---|---|
| NVDAx | `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` |
| AAPLx | `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp` |
| TSLAx | `XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB` |
| MSFTx | `XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX` |

Not financial advice. Tokenized stocks are not the listed equity.

Redeploy after changing env vars. Mainnet RPC is recommended so Jupiter can route xStock swaps.
