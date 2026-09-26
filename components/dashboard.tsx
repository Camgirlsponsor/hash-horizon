"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { COINS, COIN_BY_ID, coinPriceLabel, toHashrateInput, type CoinId, type HashUnit } from "@/lib/coins";
import type { GpuBench } from "@/lib/gpus";
import type { NetworkSnapshot } from "@/lib/network";
import { calculateOdds, toHashesPerSecond } from "@/lib/probability";
import { calculateProfit } from "@/lib/profit";
import { CoinBrief } from "@/components/coin-brief";
import { GpuBoard } from "@/components/gpu-board";
import { LuckHorizon } from "@/components/luck-horizon";
import { ProfitPanel } from "@/components/profit-panel";
import { ResultPanel } from "@/components/result-panel";
import { RigControls } from "@/components/rig-controls";

type InputState = Record<
  CoinId,
  { value: string; unit: HashUnit; watts: string; price: string; priceDirty: boolean }
>;

const initialInputs = Object.fromEntries(
  COINS.map((coin) => [
    coin.id,
    { value: coin.defaultValue, unit: coin.defaultUnit, watts: coin.defaultWatts, price: "", priceDirty: false },
  ]),
) as InputState;

function formatPriceInput(value: number): string {
  if (value >= 1000) return value.toFixed(0);
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return Number(value.toPrecision(4)).toString();
}

export function Dashboard() {
  const [mode, setMode] = useState<"chains" | "gpus">("chains");
  const [gpusVisited, setGpusVisited] = useState(false);
  const [activeId, setActiveId] = useState<CoinId>("bch2");
  const [inputs, setInputs] = useState<InputState>(initialInputs);
  const [kwh, setKwh] = useState("0.12");
  const [network, setNetwork] = useState<NetworkSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const coin = COIN_BY_ID[activeId];
  const input = inputs[activeId];
  const accent = mode === "gpus" ? COIN_BY_ID.prl.accent : coin.accent;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/network/${activeId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Network unavailable");
        return (await response.json()) as NetworkSnapshot;
      })
      .then((snapshot) => {
        setNetwork(snapshot);
        setStatus("ready");
        setInputs((current) => {
          const row = current[activeId];
          if (row.priceDirty || snapshot.priceUsd == null) return current;
          return {
            ...current,
            [activeId]: { ...row, price: formatPriceInput(snapshot.priceUsd) },
          };
        });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [activeId, retryCount]);

  const hashrate = toHashesPerSecond(Number(input.value), input.unit);
  const watts = Number(input.watts);
  const kwhPrice = Number(kwh);
  const priceUsd = Number(input.price);
  const resolvedPrice = Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : network?.priceUsd ?? null;
  const odds = useMemo(() => (network ? calculateOdds(hashrate, network) : null), [hashrate, network]);
  const profit = useMemo(
    () => (network ? calculateProfit(hashrate, Number.isFinite(watts) ? watts : 0, Number.isFinite(kwhPrice) ? kwhPrice : 0, network, resolvedPrice) : null),
    [hashrate, watts, kwhPrice, network, resolvedPrice],
  );

  function chooseCoin(id: CoinId) {
    if (id === activeId) return;
    setActiveId(id);
    setNetwork(null);
    setStatus("loading");
  }

  function patchInput(patch: Partial<InputState[CoinId]>) {
    setInputs((current) => ({
      ...current,
      [activeId]: { ...current[activeId], ...patch },
    }));
  }

  function retry() {
    setStatus("loading");
    setRetryCount((count) => count + 1);
  }

  function applyGpu(gpu: GpuBench) {
    const { value, unit } = toHashrateInput(gpu.hashrate);
    setInputs((current) => ({
      ...current,
      prl: {
        ...current.prl,
        value,
        unit,
        watts: gpu.watts > 0 ? String(Math.round(gpu.watts)) : current.prl.watts,
      },
    }));
    setMode("chains");
    if (activeId !== "prl") {
      setActiveId("prl");
      setNetwork(null);
      setStatus("loading");
    }
  }

  return (
    <main className="site-shell" style={{ "--accent": accent } as CSSProperties}>
      <div className="contour-field" aria-hidden="true">
        <svg viewBox="0 0 1200 800" preserveAspectRatio="none">
          <path d="M-80 160C180 10 334 290 590 142s398-3 690-162" />
          <path d="M-90 235C150 86 355 352 615 205s405-5 690-157" />
          <path d="M-120 718C102 503 335 777 595 582s465-35 700-259" />
          <path d="M-90 790C138 576 350 840 625 654s456-28 690-258" />
        </svg>
      </div>

      <header className="topbar">
        <a className="brand" href="#" aria-label="Hash Horizon home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>HASH HORIZON</span>
        </a>
        <div className="live-key">
          <i className={mode === "gpus" || status === "ready" ? "live" : ""} />
          {mode === "gpus"
            ? "GPU profitability"
            : status === "error"
              ? "Source offline"
              : status === "loading"
                ? "Reading chain"
                : "Live network data"}
        </div>
        <a className="method-link" href="#method">How it works <span>↘</span></a>
      </header>

      <section className="intro">
        <div className="eyebrow"><span>01</span> Solo odds and profitability</div>
        <h1>Measure your <em>one shot.</em></h1>
        <p>Live difficulty, expected time to a block, daily profit after electricity, and GPU ranks for Pearl.</p>
      </section>

      <nav className="chain-selector" aria-label="Choose a view">
        <div className="view-switch" role="tablist" aria-label="Calculator mode">
          <button role="tab" aria-selected={mode === "chains"} className={mode === "chains" ? "active" : ""} onClick={() => setMode("chains")}>
            Chains
          </button>
          <button
            role="tab"
            aria-selected={mode === "gpus"}
            className={mode === "gpus" ? "active" : ""}
            onClick={() => {
              setGpusVisited(true);
              setMode("gpus");
            }}
          >
            GPUs
          </button>
        </div>
        {mode === "chains" && (
          <>
            <div className="selector-label">Select chain</div>
            <div className="chain-options" role="tablist">
              {COINS.map((item, index) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={activeId === item.id}
                  className={activeId === item.id ? "active" : ""}
                  onClick={() => chooseCoin(item.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.ticker}</strong>
                  <small>{item.alias ?? item.algorithm.split("·")[0]}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </nav>

      {gpusVisited && (
        <div hidden={mode !== "gpus"}>
          <GpuBoard kwh={kwh} onKwhChange={setKwh} onSelectGpu={applyGpu} />
        </div>
      )}

      <div hidden={mode !== "chains"}>
      <AnimatePresence mode="wait">
        <motion.div
          className="instrument"
          key={activeId}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="instrument-head">
            <div>
              <span className="coin-code">{coin.alias ? `${coin.ticker} · ${coin.alias}` : coin.ticker}</span>
              <h2>{coin.name}</h2>
            </div>
            <div className="algorithm-stamp">
              <span>Algorithm</span>
              <strong>{coin.algorithm}</strong>
              <small>{coin.hardware}</small>
            </div>
          </div>

          <RigControls
            hashrate={input.value}
            unit={input.unit}
            watts={input.watts}
            kwh={kwh}
            price={input.price}
            livePrice={network?.priceUsd ?? null}
            ticker={coinPriceLabel(coin)}
            onHashrateChange={(value) => patchInput({ value })}
            onUnitChange={(unit) => patchInput({ unit })}
            onWattsChange={(watts) => patchInput({ watts })}
            onKwhChange={setKwh}
            onPriceChange={(price) => patchInput({ price, priceDirty: true })}
          />

          {status === "loading" && <LoadingState />}
          {status === "error" && <ErrorState onRetry={retry} />}
          {status === "ready" && network && odds && profit && hashrate > 0 && (
            <>
              <ResultPanel odds={odds} network={network} />
              <ProfitPanel coin={coin} network={network} profit={profit} priceUsd={resolvedPrice} />
              <LuckHorizon odds={odds} />
              <CoinBrief coin={coin} network={network} />
              <SourceStrip network={network} />
            </>
          )}
          {status === "ready" && hashrate <= 0 && (
            <div className="empty-state">Enter a hashrate greater than zero to reveal your horizon.</div>
          )}
        </motion.div>
      </AnimatePresence>
      </div>

      <section className="methodology" id="method">
        <div className="eyebrow"><span>02</span> The method</div>
        <div>
          <h2>No promises.<br />Only probability.</h2>
          <p>
            Every valid hash is an independent attempt. We model block discovery as a Poisson process using your
            hashrate and the chain’s current difficulty. Expected daily coins assume you receive a proportional share
            of the block subsidy over time. Profit subtracts electricity only—not hardware, pool fees, or downtime.
            GPU ranks use public PearlHash benches from Hashrate.no with this site’s live Pearl network and your
            electricity rate. BTCB2 is quoted as XBT on Neoxa Exchange.
          </p>
          <details>
            <summary>See the calculation</summary>
            <code>P(block in t) = 1 − e^(− hashrate × t ÷ expected network work)</code>
            <p>
              Bitcoin-family chains use difficulty × 2³² work. Pearl uses difficulty × 2⁴⁸. Daily revenue is
              network share × blocks per day × subsidy × USD price.
            </p>
          </details>
        </div>
      </section>

      <footer>
        <span>Hash Horizon / 2026</span>
        <span>Verify · Measure · Decide</span>
      </footer>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <span />
      <p>Reading the latest network target…</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-state" role="alert">
      <span>Signal interrupted</span>
      <p>The chain’s public data source did not answer. No estimated figures have been substituted.</p>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}

function SourceStrip({ network }: { network: NetworkSnapshot }) {
  const clock = `${network.updatedAt.slice(11, 19)} UTC`;

  return (
    <div className="source-strip">
      <span className={network.stale ? "stale" : ""}>{network.stale ? "Stale cache" : "Live"}</span>
      <p>
        Network: <a href={network.sourceUrl} target="_blank" rel="noreferrer">{network.source}</a>
        {network.priceSource ? ` · Price: ${network.priceSource}` : ""}
      </p>
      <time dateTime={network.updatedAt}>{clock}</time>
    </div>
  );
}
