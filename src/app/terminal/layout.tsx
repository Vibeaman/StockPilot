import { Suspense } from "react";

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="text-[#9a96b0]">Loading terminal…</p>}>{children}</Suspense>;
}
