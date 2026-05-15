"use client";

import { PortfolioProvider } from "@/lib/portfolioContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <PortfolioProvider>{children}</PortfolioProvider>;
}
