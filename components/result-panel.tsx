import type { NetworkSnapshot } from "@/lib/network";
import type { Odds } from "@/lib/probability";
import { formatCompactNumber, formatDuration, formatExpectedBlocks, formatHashrate, formatProbability } from "@/lib/probability";

export function ResultPanel({ odds, network }: { odds: Odds; network: NetworkSnapshot }) {
  const oneIn = odds.oneInBlocks >= 1e9 ? odds.oneInBlocks.toExponential(2) : formatCompactNumber(odds.oneInBlocks);

  return (
    <section className="result-panel" aria-live="polite">
      <div className="result-primary">
        <span>Average time to a block</span>
        <strong>{formatDuration(odds.expectedSeconds)}</strong>
        <p>A long-run average, not a countdown. Each hash is independent.</p>
      </div>
          <div className="result-grid network-stats">
        <div>
          <span>Chance next block</span>
          <strong>{formatProbability(odds.chancePerBlock)}</strong>
          <small>about 1 in {oneIn}</small>
        </div>
        <div>
          <span>Blocks / day</span>
          <strong>{formatExpectedBlocks(odds.blocksPerDay)}</strong>
          <small>{odds.blocksPerDay >= 1 ? "expected finds" : `1 every ${formatDuration(odds.expectedSeconds)}`}</small>
        </div>
        <div>
          <span>Live difficulty</span>
          <strong title={network.difficulty.toLocaleString("en-US")}>{formatCompactNumber(network.difficulty)}</strong>
          <small>block #{network.blockHeight.toLocaleString("en-US")}</small>
        </div>
        <div>
          <span>Network hashrate</span>
          <strong>{formatHashrate(network.networkHashrate)}</strong>
          <small>{Math.round(network.blockTime)}s block interval</small>
        </div>
      </div>
    </section>
  );
}
