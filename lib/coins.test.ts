import { describe, expect, it } from "vitest";
import { resolveCoinId } from "@/lib/coins";

describe("coin aliases", () => {
  it("resolves BTCB2 market tickers to the same chain", () => {
    expect(resolveCoinId("xbt")).toBe("btcb2");
    expect(resolveCoinId("BTC2B")).toBe("btcb2");
    expect(resolveCoinId("btcb2")).toBe("btcb2");
  });
});
