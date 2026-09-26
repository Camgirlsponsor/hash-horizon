import { describe, expect, it } from "vitest";
import { calculateOdds, probabilityForPeriod, toHashesPerSecond } from "@/lib/probability";
import type { NetworkSnapshot } from "@/lib/network";

const snapshot: NetworkSnapshot = {
  coin: "btc",
  difficulty: 100,
  networkHashrate: 100 * 2 ** 32 / 600,
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

describe("hashrate conversion", () => {
  it("converts common mining units", () => {
    expect(toHashesPerSecond(2.5, "TH/s")).toBe(2.5e12);
    expect(toHashesPerSecond(-1, "EH/s")).toBe(0);
  });
});

describe("solo probability", () => {
  it("returns stable boundaries", () => {
    expect(probabilityForPeriod(0, 100, 2 ** 32, 86_400)).toBe(0);
    expect(probabilityForPeriod(1e30, 1, 2 ** 32, 86_400)).toBe(1);
  });

  it("retains extremely small non-zero chances", () => {
    const chance = probabilityForPeriod(1, 1e14, 2 ** 32, 1);
    expect(chance).toBeGreaterThan(0);
    expect(chance).toBeLessThan(1e-20);
  });

  it("derives expected work, network share, and block finds", () => {
    const odds = calculateOdds(snapshot.networkHashrate / 10, snapshot);
    expect(odds.chancePerBlock).toBeCloseTo(0.1);
    expect(odds.expectedSeconds).toBeCloseTo(6_000);
    expect(odds.blocksPerDay).toBeCloseTo(14.4);
    expect(odds.horizons).toHaveLength(4);
    expect(odds.horizons.map((item) => item.label)).toEqual(["Day", "Week", "Month", "Year"]);
    expect(odds.horizons[1].expectedBlocks).toBeCloseTo(14.4 * 7);
    expect(odds.horizons[1].expectedCoins).toBeCloseTo(14.4 * 7 * 3.125);
  });
});
