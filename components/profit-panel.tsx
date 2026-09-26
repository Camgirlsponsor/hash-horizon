import type { Coin } from "@/lib/coins";
import type { NetworkSnapshot } from "@/lib/network";
import type { ProfitEstimate } from "@/lib/profit";
import { formatCoins, formatUsd } from "@/lib/profit";

export function ProfitPanel({
  coin,
  network,
  profit,
  priceUsd,
}: {
  coin: Coin;
  network: NetworkSnapshot;
  profit: ProfitEstimate;
  priceUsd: number | null;
}) {
  const tone =
    profit.profitPerDay == null ? "" : profit.profitPerDay >= 0 ? "is-profit" : "is-loss";
  const reward = network.blockReward
    ? `${network.blockReward.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${coin.ticker}`
    : "unavailable";

  return (
    <section className="profit-panel" aria-labelledby="profit-title">
      <div className="section-kicker">
        <span>Expected value</span>
        <span>{priceUsd != null ? "Live price applied" : "Enter a USD price"}</span>
      </div>
      <h2 id="profit-title">Profitability</h2>
      <div className="profit-grid">
        <div className={`profit-hero ${tone}`}>
          <span>Net per day</span>
          <strong>{formatUsd(profit.profitPerDay)}</strong>
          <p>
            {profit.profitPerDay == null
              ? "Coin yield is shown; fiat profit needs a USD price."
              : `${formatUsd(profit.profitPerMonth)} estimated over 30 days. Power is included; hardware cost is not.`}
          </p>
        </div>
        <div className="result-grid profit-stats">
          <div>
            <span>Coins / day</span>
            <strong>{formatCoins(profit.coinsPerDay, coin.ticker)}</strong>
            <small>block reward {reward}</small>
          </div>
          <div>
            <span>Revenue / day</span>
            <strong>{formatUsd(profit.revenuePerDay)}</strong>
            <small>{priceUsd != null ? `${formatUsd(priceUsd)} per ${coin.ticker}` : "no live market price"}</small>
          </div>
          <div>
            <span>Power / day</span>
            <strong>{formatUsd(profit.costPerDay)}</strong>
            <small>
              {profit.powerShare != null
                ? `${(profit.powerShare * 100).toFixed(1)}% of revenue`
                : "from watts × rate"}
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
