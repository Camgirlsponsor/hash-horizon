import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "@/app/globals.css";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Solo Chance — BCH2 Solo Mining Odds",
  description:
    "Live Bitcoin Cash II solo block probability, profitability, and network stats pulled from the BCH2 explorer.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
