import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "@/app/globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Hash Horizon — Solo Mining Odds",
  description: "Live solo block probability, GPU profitability, and chain calculators for BTC, BCH, BCH2, BTCB2/XBT, BC3 and Pearl.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
