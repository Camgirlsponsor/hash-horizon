import type { Coin } from "@/lib/coins";
import type { NetworkSnapshot } from "@/lib/network";

export function CoinBrief({ coin, network }: { coin: Coin; network: NetworkSnapshot }) {
  const explorerUrl = coin.id === "bch2" ? "https://explorer.bch2.org" : network.sourceUrl;
  const siteUrl = coin.id === "bch2" ? "https://bch2.org/" : coin.id === "bc3" ? "https://bc3.network/" : null;

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
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            Block explorer <span aria-hidden="true">↗</span>
          </a>
          {siteUrl && (
            <a href={siteUrl} target="_blank" rel="noreferrer">
              Learn more <span aria-hidden="true">↗</span>
            </a>
          )}
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
