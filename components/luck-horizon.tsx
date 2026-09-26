import { type CSSProperties } from "react";
import type { Coin } from "@/lib/coins";
import type { Odds } from "@/lib/probability";
import { formatDuration, formatExpectedBlocks, formatProbability } from "@/lib/probability";
import { formatCoins } from "@/lib/profit";

export function LuckHorizon({ odds, coin }: { odds: Odds; coin: Coin }) {
  return (
    <section className="horizon" aria-labelledby="horizon-title">
      <div className="section-kicker">
        <span>Solo outlook</span>
        <span>Expected finds at this hashrate</span>
      </div>
      <h2 id="horizon-title">Blocks you would find</h2>
      <div className="horizon-track finds-track">
        {odds.horizons.map((item, index) => {
          const visualFill = Math.max(0.018, Math.min(1, Math.pow(item.chance, 0.22)));
          return (
            <div className="horizon-stop" key={item.label}>
              <div
                className="chance-orbit"
                style={{ "--chance-fill": `${visualFill * 360}deg` } as CSSProperties}
                aria-hidden="true"
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <small className="find-window">{item.label}</small>
              <strong>{formatExpectedBlocks(item.expectedBlocks)}</strong>
              <small>blocks</small>
              <p className="find-meta">
                {formatProbability(item.chance)} chance of ≥1
                {item.expectedCoins != null ? ` · ${formatCoins(item.expectedCoins, coin.ticker)}` : ""}
              </p>
            </div>
          );
        })}
      </div>
      <p className="horizon-note">
        Long-run averages from a Poisson model, not a schedule. One block takes about {formatDuration(odds.expectedSeconds)}{" "}
        at this hashrate.
      </p>
    </section>
  );
}
