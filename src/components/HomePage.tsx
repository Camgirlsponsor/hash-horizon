import { api } from "../api";
import type { ReactNode } from "react";
import {
  formatBytes,
  formatFeeRate,
  formatHashrate,
  formatRelative,
  formatSats,
  formatUsd,
} from "../format";
import { href } from "../router";
import { useAsync } from "../useAsync";
import { Amount, ErrorNotice, Loading, TxLink } from "./common";

const REFRESH_MS = 30_000;

function HeroStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="hero-stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{children}</div>
    </div>
  );
}

export function HomePage() {
  const blocks = useAsync((signal) => api.recentBlocks(signal), [], REFRESH_MS);
  const mempool = useAsync((signal) => api.mempoolRecent(signal), [], REFRESH_MS);
  const hashrate = useAsync((signal) => api.hashrate("1w", signal), [], REFRESH_MS * 2);
  const mempoolSummary = useAsync((signal) => api.mempool(signal), [], REFRESH_MS);
  const prices = useAsync((signal) => api.prices(signal), [], REFRESH_MS * 2);
  const latest = blocks.data?.[0];

  return (
    <div className="page home">
      <section className="card hero">
        <div className="hero-kicker">The Quarry · Bitcoin Cash II</div>
        <h1 className="hero-title">Explore the BCH2 chain</h1>
        <p className="hero-sub">
          The crystals in the header are the latest mined blocks. Hollow ones carried only the
          coinbase; brighter, larger ones held more transactions. Color is the pool that found
          them.
        </p>
        <div className="hero-stats">
          <HeroStat label="Latest block">
            {latest ? (
              <a href={href.block(latest.id)}>#{latest.height.toLocaleString("en-US")}</a>
            ) : (
              "…"
            )}
          </HeroStat>
          <HeroStat label="Mined">{latest ? formatRelative(latest.timestamp) : "…"}</HeroStat>
          <HeroStat label="Hashrate">
            {hashrate.data ? formatHashrate(hashrate.data.currentHashrate) : "…"}
          </HeroStat>
          <HeroStat label="Mempool">
            {mempoolSummary.data ? mempoolSummary.data.count.toLocaleString("en-US") : "…"}
          </HeroStat>
          <HeroStat label="Price">
            {prices.data?.USD !== undefined ? formatUsd(prices.data.USD) : "…"}
          </HeroStat>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Latest blocks</h2>
          <span className="muted small">auto-refreshes every 30s</span>
        </div>
        {blocks.status === "error" && !blocks.data && (
          <ErrorNotice error={blocks.error} what="Latest blocks" />
        )}
        {!blocks.data && blocks.status === "loading" && <Loading />}
        {blocks.data && (
          <table className="table">
            <thead>
              <tr>
                <th>Height</th>
                <th>Mined</th>
                <th className="num">Txs</th>
                <th className="num">Size</th>
                <th>Miner</th>
              </tr>
            </thead>
            <tbody>
              {blocks.data.map((b) => (
                <tr key={b.id}>
                  <td>
                    <a href={href.block(b.id)}>#{b.height.toLocaleString("en-US")}</a>
                  </td>
                  <td className="muted nowrap">{formatRelative(b.timestamp)}</td>
                  <td className="num">{b.tx_count}</td>
                  <td className="num">{formatBytes(b.size)}</td>
                  <td className="muted">{b.extras?.pool?.name ?? "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Recent mempool transactions</h2>
        </div>
        {mempool.status === "error" && !mempool.data && (
          <ErrorNotice error={mempool.error} what="Mempool" />
        )}
        {!mempool.data && mempool.status === "loading" && <Loading />}
        {mempool.data && mempool.data.length === 0 && (
          <div className="notice">The mempool is empty right now.</div>
        )}
        {mempool.data && mempool.data.length > 0 && (
          <ul className="tx-list">
            {mempool.data.map((tx) => (
              <li key={tx.txid} className="tx-row">
                <div className="tx-row-main">
                  <TxLink txid={tx.txid} />
                </div>
                <div className="tx-row-sub">
                  <span className="muted">
                    fee {formatSats(tx.fee)} · {formatFeeRate(tx.fee, tx.vsize)}
                    {tx.time ? ` · seen ${formatRelative(tx.time)}` : ""}
                  </span>
                  <Amount sats={tx.value} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
