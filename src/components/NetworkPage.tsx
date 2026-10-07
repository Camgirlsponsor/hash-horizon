import { useState, type MouseEvent, type ReactNode } from "react";
import { api, type HashrateHistory, type MiningPeriod } from "../api";
import {
  blockRewardAt,
  formatDate,
  formatDuration,
  formatHashrate,
  formatUsd,
  HALVING_INTERVAL,
} from "../format";
import { href } from "../router";
import { useAsync } from "../useAsync";
import { ErrorNotice, Loading } from "./common";

const REFRESH_MS = 60_000;
const BLOCK_TIME_SAMPLE = 1008;
const TARGET_BLOCK_TIME = 600;

const PERIODS: { id: MiningPeriod; label: string }[] = [
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All" },
];

export function NetworkPage() {
  const [period, setPeriod] = useState<MiningPeriod>("1m");

  const tip = useAsync((signal) => api.recentBlocks(signal), [], REFRESH_MS);
  const tipBlock = tip.data?.[0];
  const blockTime = useAsync(
    async (signal) => {
      if (!tipBlock) return undefined;
      const [old] = await api.blocksFrom(tipBlock.height - BLOCK_TIME_SAMPLE, signal);
      return (tipBlock.timestamp - old.timestamp) / (tipBlock.height - old.height);
    },
    [tipBlock?.height],
  );
  const supply = useAsync(
    async (signal) => {
      const [circulating, max] = await Promise.all([
        api.circulatingSupply(signal),
        api.maxSupply(signal),
      ]);
      return { circulating, max };
    },
    [],
    REFRESH_MS,
  );
  const prices = useAsync((signal) => api.prices(signal), [], REFRESH_MS);
  const mempool = useAsync((signal) => api.mempool(signal), [], REFRESH_MS);
  const hashrate = useAsync((signal) => api.hashrate(period, signal), [period]);
  const pools = useAsync((signal) => api.pools(period, signal), [period]);

  const price = prices.data?.USD;
  const height = tipBlock?.height;
  const avgBlockTime = blockTime.data ?? TARGET_BLOCK_TIME;

  return (
    <div className="page">
      <section className="stats">
        <Stat label="Block height">
          {height !== undefined ? (
            <a href={href.block(tipBlock!.id)}>{height.toLocaleString("en-US")}</a>
          ) : (
            "…"
          )}
        </Stat>
        <Stat label="Hashrate">
          {hashrate.data ? formatHashrate(hashrate.data.currentHashrate) : "…"}
        </Stat>
        <Stat label="Difficulty">
          {hashrate.data
            ? hashrate.data.currentDifficulty.toLocaleString("en-US", { maximumFractionDigits: 0 })
            : "…"}
        </Stat>
        <Stat label={`Avg block time (last ${BLOCK_TIME_SAMPLE.toLocaleString("en-US")})`}>
          {blockTime.data !== undefined ? formatDuration(blockTime.data) : "…"}
          {blockTime.data !== undefined && <span className="muted small"> target 10 min</span>}
        </Stat>
        <Stat label="Price">{price !== undefined ? formatUsd(price) : "…"}</Stat>
        <Stat label="Market cap">
          {price !== undefined && supply.data ? formatUsd(price * supply.data.circulating) : "…"}
        </Stat>
        <Stat label="Mempool">
          {mempool.data
            ? `${mempool.data.count.toLocaleString("en-US")} ${mempool.data.count === 1 ? "tx" : "txs"}`
            : "…"}
        </Stat>
      </section>

      <SupplyCard
        height={height}
        avgBlockTime={avgBlockTime}
        circulating={supply.data?.circulating}
        max={supply.data?.max}
      />

      <section className="card">
        <div className="card-head">
          <h2>Hashrate</h2>
          <div className="nav-buttons" role="group" aria-label="Time period">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={p.id === period ? "period active" : "period secondary"}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {hashrate.status === "error" && <ErrorNotice error={hashrate.error} what="Hashrate" />}
        {hashrate.status === "loading" && <Loading label="Loading hashrate…" />}
        {hashrate.status === "success" && <HashrateChart data={hashrate.data} />}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Mining pools</h2>
          <span className="muted small">
            {pools.data
              ? `${pools.data.blockCount.toLocaleString("en-US")} blocks in period`
              : ""}
          </span>
        </div>
        {pools.status === "error" && <ErrorNotice error={pools.error} what="Mining pools" />}
        {pools.status === "loading" && <Loading label="Loading pools…" />}
        {pools.status === "success" && (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pool</th>
                <th className="num">Blocks</th>
                <th className="share-col">Share</th>
                <th className="num" title="Blocks containing only the coinbase transaction">
                  Empty blocks
                </th>
              </tr>
            </thead>
            <tbody>
              {pools.data.pools.map((pool) => {
                const share = pool.blockCount / pools.data.blockCount;
                return (
                  <tr key={pool.poolId}>
                    <td className="muted">{pool.rank}</td>
                    <td>
                      {pool.link ? (
                        <a href={pool.link} target="_blank" rel="noreferrer">
                          {pool.name}
                        </a>
                      ) : (
                        pool.name
                      )}
                    </td>
                    <td className="num">{pool.blockCount.toLocaleString("en-US")}</td>
                    <td className="share-col">
                      <div className="bar">
                        <div className="bar-fill" style={{ width: `${share * 100}%` }} />
                        <span>{(share * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="num muted">
                      {pool.emptyBlocks.toLocaleString("en-US")}
                      {pool.blockCount > 0 &&
                        ` (${Math.round((pool.emptyBlocks / pool.blockCount) * 100)}%)`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="stat card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{children}</div>
    </div>
  );
}

function SupplyCard({
  height,
  avgBlockTime,
  circulating,
  max,
}: {
  height?: number;
  avgBlockTime: number;
  circulating?: number;
  max?: number;
}) {
  const nextHalving =
    height !== undefined ? (Math.floor(height / HALVING_INTERVAL) + 1) * HALVING_INTERVAL : undefined;
  const blocksLeft = height !== undefined && nextHalving !== undefined ? nextHalving - height : undefined;
  const eta = blocksLeft !== undefined ? blocksLeft * avgBlockTime : undefined;
  const pct = circulating !== undefined && max ? (circulating / max) * 100 : undefined;

  return (
    <section className="card">
      <div className="card-head">
        <h2>Supply &amp; halving</h2>
      </div>
      <div className="supply">
        <div>
          <div className="stat-label">Circulating supply</div>
          <div className="stat-value">
            {circulating !== undefined
              ? `${circulating.toLocaleString("en-US", { maximumFractionDigits: 0 })} BCH2`
              : "…"}
            {max !== undefined && (
              <span className="muted small"> of {max.toLocaleString("en-US")}</span>
            )}
          </div>
          {pct !== undefined && (
            <div className="bar large">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
              <span>{pct.toFixed(2)}% issued</span>
            </div>
          )}
          <div className="muted small supply-note">
            Includes ~2.66M BCH2 distributed 1:1 to BitcoinII (BC2) holders at the fork (block
            53,200).
          </div>
        </div>
        <div>
          <div className="stat-label">Block reward</div>
          <div className="stat-value">
            {height !== undefined ? `${blockRewardAt(height)} BCH2` : "…"}
          </div>
          <div className="stat-label">Next halving</div>
          <div className="stat-value">
            {nextHalving !== undefined && blocksLeft !== undefined && eta !== undefined ? (
              <>
                Block {nextHalving.toLocaleString("en-US")}{" "}
                <span className="muted small">
                  ({blocksLeft.toLocaleString("en-US")} blocks, ~{formatDuration(eta)}, around{" "}
                  {formatDate(Date.now() / 1000 + eta)})
                </span>
              </>
            ) : (
              "…"
            )}
          </div>
          {height !== undefined && (
            <div className="muted small">
              Reward drops to {blockRewardAt(nextHalving!)} BCH2.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const CHART_W = 800;
const CHART_H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 78 };

function HashrateChart({ data }: { data: HashrateHistory }) {
  const points = data.hashrates;
  const [hover, setHover] = useState<number>();

  if (points.length < 2) {
    return <div className="notice">Not enough data for this period.</div>;
  }

  const minT = points[0].timestamp;
  const maxT = points[points.length - 1].timestamp;
  const maxH = Math.max(...points.map((p) => p.avgHashrate)) * 1.1;
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - minT) / (maxT - minT)) * innerW;
  const y = (h: number) => PAD.top + innerH - (h / maxH) * innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.timestamp)},${y(p.avgHashrate)}`).join("");
  const area = `${line}L${x(maxT)},${PAD.top + innerH}L${x(minT)},${PAD.top + innerH}Z`;
  const gridValues = [0.25, 0.5, 0.75, 1].map((f) => maxH * f);
  const hovered = hover !== undefined ? points[hover] : undefined;

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = minT + (((e.clientX - rect.left) / rect.width) * CHART_W - PAD.left) / innerW * (maxT - minT);
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].timestamp - t) < Math.abs(points[best].timestamp - t)) best = i;
    }
    setHover(best);
  };

  return (
    <div className="chart">
      <div className="chart-readout">
        {hovered ? (
          <>
            <strong>{formatHashrate(hovered.avgHashrate)}</strong>{" "}
            <span className="muted">on {formatDate(hovered.timestamp)}</span>
          </>
        ) : (
          <span className="muted">Hover the chart for daily averages</span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="chart-svg"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(undefined)}
        role="img"
        aria-label="Network hashrate over time"
      >
        <defs>
          <linearGradient id="hashrate-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2bffc6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hashrate-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2bffc6" />
            <stop offset="55%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="hashrate-glow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={CHART_W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              className="chart-grid"
            />
            <text x={PAD.left - 8} y={y(v) + 4} className="chart-label" textAnchor="end">
              {formatHashrate(v)}
            </text>
          </g>
        ))}
        <path d={area} className="chart-area" />
        <path d={line} className="chart-line" />
        {[minT, (minT + maxT) / 2, maxT].map((t, i) => (
          <text
            key={t}
            x={x(t)}
            y={CHART_H - 8}
            className="chart-label"
            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          >
            {formatDate(t)}
          </text>
        ))}
        {hovered && (
          <>
            <line
              x1={x(hovered.timestamp)}
              x2={x(hovered.timestamp)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              className="chart-cursor"
            />
            <circle cx={x(hovered.timestamp)} cy={y(hovered.avgHashrate)} r={4} className="chart-dot" />
          </>
        )}
      </svg>
    </div>
  );
}
