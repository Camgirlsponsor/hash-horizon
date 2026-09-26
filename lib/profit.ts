import type { NetworkSnapshot } from "@/lib/network";

export type ProfitEstimate = {
  coinsPerDay: number;
  revenuePerDay: number | null;
  costPerDay: number;
  profitPerDay: number | null;
  profitPerMonth: number | null;
  powerShare: number | null;
};

export function calculateProfit(
  hashrate: number,
  watts: number,
  kwhPrice: number,
  snapshot: NetworkSnapshot,
  priceUsd = snapshot.priceUsd,
): ProfitEstimate {
  const blocksPerDay = snapshot.blockTime > 0 ? 86_400 / snapshot.blockTime : 0;
  const networkShare = snapshot.networkHashrate > 0 ? Math.min(1, Math.max(0, hashrate) / snapshot.networkHashrate) : 0;
  const coinsPerDay = snapshot.blockReward ? networkShare * blocksPerDay * snapshot.blockReward : 0;
  const costPerDay = (Math.max(0, watts) / 1000) * 24 * Math.max(0, kwhPrice);
  const revenuePerDay = priceUsd != null && priceUsd > 0 ? coinsPerDay * priceUsd : null;
  const profitPerDay = revenuePerDay != null ? revenuePerDay - costPerDay : null;
  const profitPerMonth = profitPerDay != null ? profitPerDay * 30 : null;
  const powerShare = revenuePerDay != null && revenuePerDay > 0 ? costPerDay / revenuePerDay : null;

  return {
    coinsPerDay,
    revenuePerDay,
    costPerDay,
    profitPerDay,
    profitPerMonth,
    powerShare,
  };
}

export function formatUsd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  const formatted = value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return formatted;
}

export function formatCoins(value: number, ticker: string): string {
  if (!Number.isFinite(value) || value <= 0) return `0 ${ticker}`;
  const digits = value >= 100 ? 2 : value >= 1 ? 4 : 6;
  return `${value.toLocaleString("en-US", { maximumFractionDigits: digits })} ${ticker}`;
}
