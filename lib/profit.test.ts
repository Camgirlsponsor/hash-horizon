import { describe, expect, it } from "vitest";
import { calculateProfit } from "@/lib/profit";
import type { NetworkSnapshot } from "@/lib/network";

const snapshot: NetworkSnapshot = {
  coin: "btc",
  difficulty: 100,
  networkHashrate: 1e12,
  blockHeight: 1,
  blockTime: 600,
  blockReward: 3.125,
  priceUsd: 80_000,
  priceSource: "test",
  updatedAt: new Date(0).toISOString(),
  source: "test",
  sourceUrl: "https://example.com",
  stale: false,
  workFactor: 2 ** 32,
};

describe("profitability", () => {
  it("scales expected coins with network share", () => {
    const result = calculateProfit(1e11, 0, 0, snapshot);
    expect(result.coinsPerDay).toBeCloseTo(0.1 * (86_400 / 600) * 3.125);
    expect(result.revenuePerDay).toBeCloseTo(result.coinsPerDay * 80_000);
    expect(result.costPerDay).toBe(0);
  });

  it("subtracts electricity from daily profit", () => {
    const result = calculateProfit(1e12, 3500, 0.12, snapshot);
    expect(result.costPerDay).toBeCloseTo(10.08);
    expect(result.profitPerDay).toBeCloseTo((result.revenuePerDay ?? 0) - 10.08);
    expect(result.breakEvenKwh).toBeCloseTo((result.revenuePerDay ?? 0) / ((3500 / 1000) * 24));
  });

  it("omits fiat totals when price is missing", () => {
    const result = calculateProfit(1e12, 100, 0.1, { ...snapshot, priceUsd: null });
    expect(result.revenuePerDay).toBeNull();
    expect(result.profitPerDay).toBeNull();
    expect(result.coinsPerDay).toBeGreaterThan(0);
  });
});
