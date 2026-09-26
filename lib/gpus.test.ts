import { describe, expect, it } from "vitest";
import { parseHashrateNoGpuBenches, rankGpus } from "@/lib/gpus";
import { toHashrateInput } from "@/lib/coins";
import type { NetworkSnapshot } from "@/lib/network";

const html = `
<table>
<tr onclick="window.location='/gpus/5090/PRL';"><td>RTX 5090</td><td><div>309.3 Th/s</div></td></tr>
<tr onclick="window.location='/gpus/5080/PRL';"><td>RTX 5080</td><td><div>203.6 Th/s</div></td></tr>
</table>
<table>
<tr onclick="window.location='/gpus/5090/PRL';"><td>RTX 5090</td><td><div>0.606 Th/W</div></td></tr>
<tr onclick="window.location='/gpus/5080/PRL';"><td>RTX 5080</td><td><div>0.500 Th/W</div></td></tr>
</table>
`;

const snapshot: NetworkSnapshot = {
  coin: "prl",
  difficulty: 1,
  networkHashrate: 1e15,
  blockHeight: 1,
  blockTime: 216,
  blockReward: 50,
  priceUsd: 0.6,
  priceSource: "test",
  updatedAt: new Date(0).toISOString(),
  source: "test",
  sourceUrl: "https://example.com",
  stale: false,
  workFactor: 2 ** 48,
};

describe("hashrate.no GPU parser", () => {
  it("joins hashrate and efficiency into watts", () => {
    const gpus = parseHashrateNoGpuBenches(html);
    expect(gpus).toHaveLength(2);
    const rtx5090 = gpus.find((gpu) => gpu.slug === "5090");
    expect(rtx5090?.name).toBe("RTX 5090");
    expect(rtx5090?.hashrate).toBeCloseTo(309.3e12);
    expect(rtx5090?.watts).toBeCloseTo(309.3 / 0.606, 5);
  });

  it("ranks cards by net profit after power", () => {
    const ranked = rankGpus(parseHashrateNoGpuBenches(html), snapshot, 0.12);
    expect(ranked[0].slug).toBe("5090");
    expect(ranked[0].profit.profitPerDay).toBeGreaterThan(ranked[1].profit.profitPerDay ?? 0);
  });
});

describe("hashrate input helpers", () => {
  it("maps hashes per second into a compact calculator unit", () => {
    expect(toHashrateInput(309.3e12)).toEqual({ value: "309.3", unit: "TH/s" });
  });
});
