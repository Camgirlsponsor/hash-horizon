import { describe, expect, it } from "vitest";
import type { NetworkSnapshot } from "@/lib/network";
import { buildSoloReport, halvingOutlook, scaleRig, timeUntilProbability } from "@/lib/solo";

const snapshot: NetworkSnapshot = {
  coin: "bch2",
  difficulty: 100,
  networkHashrate: (100 * 2 ** 32) / 600,
  blockHeight: 80_000,
  blockTime: 600,
  blockReward: 50,
  priceUsd: 0.05,
  priceSource: "test",
  updatedAt: new Date(0).toISOString(),
  source: "test",
  sourceUrl: "https://example.com",
  stale: false,
  workFactor: 2 ** 32,
};

describe("solo rig scaling", () => {
  it("applies miner count and uptime to hashrate and watts", () => {
    expect(scaleRig(10, 2, 50)).toBe(10);
    expect(scaleRig(10, 0, 100)).toBe(0);
    expect(scaleRig(10, 1, 150)).toBe(10);
  });

  it("places the median find at ln(2) times the expected wait", () => {
    expect(timeUntilProbability(1_000, 0.5)).toBeCloseTo(Math.log(2) * 1_000);
    expect(timeUntilProbability(1_000, 0.9)).toBeGreaterThan(1_000);
  });

  it("counts blocks remaining until the next Bitcoin-style halving", () => {
    const outlook = halvingOutlook(80_000, 210_000, 50, 600);
    expect(outlook?.blocksRemaining).toBe(130_000);
    expect(outlook?.currentReward).toBe(50);
    expect(outlook?.nextReward).toBe(25);
    expect(outlook?.secondsRemaining).toBe(130_000 * 600);
  });

  it("builds a ledger, pool comparison, and payback from one rig", () => {
    const report = buildSoloReport({
      hashrateEach: snapshot.networkHashrate / 10,
      miners: 1,
      wattsEach: 3_500,
      uptimePercent: 100,
      kwhPrice: 0.12,
      priceUsd: 0.05,
      hardwareUsd: 1_000,
      poolFeePercent: 1,
      snapshot,
      halvingInterval: 210_000,
      genesisSubsidy: 50,
    });

    expect(report.odds.chancePerBlock).toBeCloseTo(0.1);
    expect(report.ledger).toHaveLength(5);
    expect(report.ledger[1].label).toBe("Day");
    expect(report.ledger[1].expectedBlocks).toBeCloseTo(14.4);
    expect(report.pool.coinsPerDay).toBeCloseTo(report.profit.coinsPerDay * 0.99);
    expect(report.coinsPerDayAfterHalving).toBeCloseTo(report.profit.coinsPerDay / 2);
    expect(report.paybackDays).toBeGreaterThan(0);
    expect(report.blockValueUsd).toBeCloseTo(2.5);
  });
});
