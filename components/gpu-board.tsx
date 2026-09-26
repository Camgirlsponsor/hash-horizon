"use client";

import { useEffect, useMemo, useState } from "react";
import { COIN_BY_ID } from "@/lib/coins";
import { displayHashrate, rankGpus, type GpuBench, type GpuLeaderboard } from "@/lib/gpus";
import { formatCoins, formatUsd } from "@/lib/profit";

type SortKey = "profit" | "coins" | "hashrate" | "efficiency";

export function GpuBoard({
  kwh,
  onKwhChange,
  onSelectGpu,
}: {
  kwh: string;
  onKwhChange: (value: string) => void;
  onSelectGpu: (gpu: GpuBench) => void;
}) {
  const [board, setBoard] = useState<GpuLeaderboard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("profit");
  const pearl = COIN_BY_ID.prl;
  const kwhPrice = Number(kwh);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/gpus", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("GPU board unavailable");
        return (await response.json()) as GpuLeaderboard;
      })
      .then((data) => {
        setBoard(data);
        setStatus("ready");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [retryCount]);

  const ranked = useMemo(() => {
    if (!board) return [];
    const rows = rankGpus(board.gpus, board.snapshot, Number.isFinite(kwhPrice) ? kwhPrice : 0);
    const filtered = query.trim()
      ? rows.filter((gpu) => gpu.name.toLowerCase().includes(query.trim().toLowerCase()))
      : rows;
    return filtered.slice().sort((a, b) => {
      if (sort === "coins") return b.profit.coinsPerDay - a.profit.coinsPerDay;
      if (sort === "hashrate") return b.hashrate - a.hashrate;
      if (sort === "efficiency") return (b.efficiency ?? 0) - (a.efficiency ?? 0);
      return (b.profit.profitPerDay ?? Number.NEGATIVE_INFINITY) - (a.profit.profitPerDay ?? Number.NEGATIVE_INFINITY);
    });
  }, [board, kwhPrice, query, sort]);

  const bestProfit = ranked[0]?.profit.profitPerDay ?? 0;

  return (
    <div className="instrument gpu-instrument">
      <div className="instrument-head">
        <div>
          <span className="coin-code">GPU · {pearl.ticker}</span>
          <h2>Card profitability</h2>
        </div>
        <div className="algorithm-stamp">
          <span>Source</span>
          <strong>PearlHash</strong>
          <small>Hashrate.no benches</small>
        </div>
      </div>

      <div className="gpu-toolbar">
        <div className="field">
          <label htmlFor="gpu-search">Find a GPU</label>
          <div className="unit-field">
            <input
              id="gpu-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="RTX 5090"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="gpu-kwh">Electricity</label>
          <div className="unit-field">
            <input
              id="gpu-kwh"
              value={kwh}
              onChange={(event) => onKwhChange(event.target.value.replace(/[^0-9.eE+-]/g, ""))}
              inputMode="decimal"
              autoComplete="off"
            />
            <span>$/kWh</span>
          </div>
        </div>
        <div className="field gpu-sort">
          <span>Rank by</span>
          <div className="sort-pills" role="group" aria-label="Sort GPUs">
            {(
              [
                ["profit", "Profit"],
                ["coins", "Coins"],
                ["hashrate", "Hashrate"],
                ["efficiency", "Efficiency"],
              ] as const
            ).map(([key, label]) => (
              <button key={key} className={sort === key ? "active" : ""} onClick={() => setSort(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {status === "loading" && (
        <div className="loading-state" role="status">
          <span />
          <p>Reading Hashrate.no GPU benches…</p>
        </div>
      )}
      {status === "error" && (
        <div className="error-state" role="alert">
          <span>Benches unavailable</span>
          <p>The public GPU table did not load. Chain calculators still work from live node data.</p>
          <button
            onClick={() => {
              setStatus("loading");
              setRetryCount((count) => count + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}
      {status === "ready" && board && (
        <>
          <div className="gpu-table-wrap">
            <table className="gpu-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>GPU</th>
                  <th>Hashrate</th>
                  <th>Power</th>
                  <th>Coins / day</th>
                  <th>Net / day</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((gpu, index) => {
                  const tone =
                    gpu.profit.profitPerDay == null
                      ? ""
                      : gpu.profit.profitPerDay >= 0
                        ? "is-profit"
                        : "is-loss";
                  const best = Math.max(0, bestProfit);
                  const width =
                    best > 0 && gpu.profit.profitPerDay != null && gpu.profit.profitPerDay > 0
                      ? Math.max(6, Math.min(100, (gpu.profit.profitPerDay / best) * 100))
                      : 0;
                  return (
                    <tr
                      key={gpu.slug}
                      role="button"
                      tabIndex={0}
                      aria-label={`Use ${gpu.name} in the Pearl calculator`}
                      onClick={() => onSelectGpu(gpu)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectGpu(gpu);
                        }
                      }}
                    >
                      <td>{index + 1}</td>
                      <td>
                        <strong>{gpu.name}</strong>
                        <small>
                          {gpu.efficiency
                            ? `${(gpu.efficiency / 1e12).toLocaleString("en-US", { maximumFractionDigits: 3 })} TH/W`
                            : "efficiency n/a"}
                        </small>
                      </td>
                      <td>{displayHashrate(gpu.hashrate)}</td>
                      <td>{gpu.watts > 0 ? `${Math.round(gpu.watts)} W` : "—"}</td>
                      <td>{formatCoins(gpu.profit.coinsPerDay, pearl.ticker)}</td>
                      <td className={tone}>
                        <span className="gpu-bar" style={{ width: `${width}%` }} />
                        <strong>{formatUsd(gpu.profit.profitPerDay)}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ranked.length === 0 && <div className="empty-state">No GPUs match that name.</div>}
          </div>
          <div className="source-strip">
            <span className={board.snapshot.stale ? "stale" : ""}>
              {board.snapshot.stale ? "Stale cache" : "Live"}
            </span>
            <p>
              Hashrates:{" "}
              <a href={board.sourceUrl} target="_blank" rel="noreferrer">
                {board.source}
              </a>
              {board.snapshot.priceSource ? ` · Price: ${board.snapshot.priceSource}` : ""} · Click a card to load it
              into the Pearl calculator
            </p>
            <time dateTime={board.updatedAt}>{`${board.updatedAt.slice(11, 19)} UTC`}</time>
          </div>
        </>
      )}
    </div>
  );
}
