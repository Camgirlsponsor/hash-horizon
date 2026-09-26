import type { Coin } from "@/lib/coins";
import type { NetworkSnapshot } from "@/lib/network";

export function CoinBrief({ coin, network }: { coin: Coin; network: NetworkSnapshot }) {
  return (
    <aside className="coin-brief">
      <div className="brief-index" aria-hidden="true">
        {coin.ticker.slice(0, 2)}
      </div>
      <div>
        <div className="brief-tags">
          <span>{coin.algorithm}</span>
          <span>{coin.hardware}</span>
        </div>
        <h2>What mines {coin.ticker}?</h2>
        <p>{coin.brief}</p>
        <div className="brief-links">
          <a href={coin.id === "bc3" ? "https://bc3.network/" : network.sourceUrl} target="_blank" rel="noreferrer">
            Read the source <span aria-hidden="true">↗</span>
          </a>
          {coin.marketUrl && (
            <a href={coin.marketUrl} target="_blank" rel="noreferrer">
              {coin.marketLabel ?? "Market"} <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
