import { describe, expect, it } from "vitest";
import { COIN_BY_ID } from "@/lib/coins";
import { normalizeNetworkData, subsidyFromHeight } from "@/lib/network";

describe("network provider normalization", () => {
  it("maps Bitcoin-style node fields", () => {
    const snapshot = normalizeNetworkData(
      { blocks: 100, difficulty: 200, networkhashps: 1e12 },
      COIN_BY_ID.btc,
      "https://example.com",
      "Example",
    );
    expect(snapshot.blockHeight).toBe(100);
    expect(snapshot.difficulty).toBe(200);
    expect(snapshot.source).toBe("Example");
    expect(snapshot.blockTime).toBeCloseTo((200 * 2 ** 32) / 1e12);
    expect(snapshot.blockReward).toBe(50);
  });

  it("maps Pearl fallback fields and supplied block time", () => {
    const snapshot = normalizeNetworkData(
      { last_block: 20, difficulty: 30, nethash: 4e16, block_time: "216.0" },
      COIN_BY_ID.prl,
    );
    expect(snapshot.blockHeight).toBe(20);
    expect(snapshot.blockTime).toBe(216);
  });

  it("rejects malformed or partial provider data", () => {
    expect(() => normalizeNetworkData({ difficulty: 10 }, COIN_BY_ID.bch)).toThrow(
      "missing required network fields",
    );
  });

  it("applies Bitcoin-style subsidy halvings", () => {
    expect(subsidyFromHeight(840_000, 50, 210_000)).toBe(3.125);
    expect(subsidyFromHeight(80_000, 50, 210_000)).toBe(50);
  });
});
