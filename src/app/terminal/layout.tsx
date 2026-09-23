import { Suspense } from "react";

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="text-[#8b919b]">Loading terminal…</p>}>{children}</Suspense>;
}
