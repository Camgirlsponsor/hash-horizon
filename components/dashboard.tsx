"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AboutBch2 } from "@/components/about-bch2";
import { CoinBrief } from "@/components/coin-brief";
import { HashField } from "@/components/hash-field";
import { LuckHorizon } from "@/components/luck-horizon";
import { NetworkTicker } from "@/components/network-ticker";
import { ProfitPanel } from "@/components/profit-panel";
import { ResultPanel } from "@/components/result-panel";
import { RigControls } from "@/components/rig-controls";
import { COIN_BY_ID, coinPriceLabel, type HashUnit } from "@/lib/coins";
import type { NetworkSnapshot } from "@/lib/network";
import { calculateOdds, toHashesPerSecond } from "@/lib/probability";
import { calculateProfit } from "@/lib/profit";

const coin = COIN_BY_ID.bch2;

function formatPriceInput(value: number): string {
  if (value >= 1000) return value.toFixed(0);
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return Number(value.toPrecision(4)).toString();
}

export function Dashboard({ initialNetwork = null }: { initialNetwork?: NetworkSnapshot | null }) {
  const [hashrateValue, setHashrateValue] = useState(coin.defaultValue);
  const [unit, setUnit] = useState<HashUnit>(coin.defaultUnit);
  const [watts, setWatts] = useState(coin.defaultWatts);
  const [kwh, setKwh] = useState("0.12");
  const [price, setPrice] = useState(
    initialNetwork?.priceUsd != null ? formatPriceInput(initialNetwork.priceUsd) : "",
  );
  const priceDirtyRef = useRef(false);
  const [network, setNetwork] = useState<NetworkSnapshot | null>(initialNetwork);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(initialNetwork ? "ready" : "loading");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/network/bch2", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Network unavailable");
        return (await response.json()) as NetworkSnapshot;
      })
      .then((snapshot) => {
        setNetwork(snapshot);
        setStatus("ready");
        if (!priceDirtyRef.current && snapshot.priceUsd != null) {
          setPrice(formatPriceInput(snapshot.priceUsd));
        }
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [retryCount]);

  const hashrate = toHashesPerSecond(Number(hashrateValue), unit);
  const wattsNum = Number(watts);
  const kwhPrice = Number(kwh);
  const priceUsd = Number(price);
  const resolvedPrice = Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : network?.priceUsd ?? null;
  const odds = useMemo(() => (network ? calculateOdds(hashrate, network) : null), [hashrate, network]);
  const profit = useMemo(
    () =>
      network
        ? calculateProfit(
            hashrate,
            Number.isFinite(wattsNum) ? wattsNum : 0,
            Number.isFinite(kwhPrice) ? kwhPrice : 0,
            network,
            resolvedPrice,
          )
        : null,
    [hashrate, wattsNum, kwhPrice, network, resolvedPrice],
  );

  function retry() {
    setStatus("loading");
    setRetryCount((count) => count + 1);
  }

  return (
    <main className="site-shell" style={{ "--accent": coin.accent } as CSSProperties}>
      <HashField />

      <header className="topbar">
        <a className="brand" href="#" aria-label="Hash Horizon home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          <span>Hash Horizon</span>
        </a>
        <nav className="top-nav" aria-label="Primary">
          <a href="#odds">Odds</a>
          <a href="#about">About BCH2</a>
          <a href="#method">Method</a>
          <a className="nav-cta" href="https://explorer.bch2.org" target="_blank" rel="noreferrer">
            Explorer
          </a>
        </nav>
      </header>

      <section className="hero">
        <motion.p
          className="hero-brand"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Hash Horizon
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          Your shot at a <em>BCH2</em> block.
        </motion.h1>
        <motion.p
          className="hero-lede"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          Live Bitcoin Cash II difficulty, solo odds, and expected value—pulled from the public explorer.
        </motion.p>
        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <a className="btn-primary" href="#odds">
            Calculate odds
          </a>
          <a className="btn-ghost" href="#about">
            What is BCH2
          </a>
        </motion.div>
      </section>

      <NetworkTicker network={network} status={status} />

      <section className="calc-section" id="odds" aria-labelledby="odds-title">
        <div className="section-intro">
          <div className="eyebrow">
            <span>01</span> Solo calculator
          </div>
          <h2 id="odds-title">Enter your hashrate.</h2>
          <p>We model block discovery as a Poisson process against the live BCH2 network target.</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            className="instrument"
            key="bch2-instrument"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="instrument-head">
              <div>
                <span className="coin-code">{coin.ticker}</span>
                <h3>{coin.name}</h3>
              </div>
              <div className="algorithm-stamp">
                <span>Algorithm</span>
                <strong>{coin.algorithm}</strong>
                <small>{coin.hardware}</small>
              </div>
            </div>

            <RigControls
              hashrate={hashrateValue}
              unit={unit}
              watts={watts}
              kwh={kwh}
              price={price}
              livePrice={network?.priceUsd ?? null}
              ticker={coinPriceLabel(coin)}
              onHashrateChange={setHashrateValue}
              onUnitChange={setUnit}
              onWattsChange={setWatts}
              onKwhChange={setKwh}
              onPriceChange={(value) => {
                priceDirtyRef.current = true;
                setPrice(value);
              }}
            />

            {status === "loading" && <LoadingState />}
            {status === "error" && <ErrorState onRetry={retry} />}
            {status === "ready" && network && odds && profit && hashrate > 0 && (
              <>
                <ResultPanel odds={odds} network={network} />
                <ProfitPanel coin={coin} network={network} profit={profit} priceUsd={resolvedPrice} />
                <LuckHorizon odds={odds} coin={coin} />
                <CoinBrief coin={coin} network={network} />
                <SourceStrip network={network} />
              </>
            )}
            {status === "ready" && hashrate <= 0 && (
              <div className="empty-state">Enter a hashrate greater than zero to reveal your horizon.</div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <AboutBch2 />

      <section className="methodology" id="method">
        <div className="eyebrow">
          <span>03</span> The method
        </div>
        <div>
          <h2>
            No promises.
            <br />
            Only probability.
          </h2>
          <p>
            Every valid hash is an independent attempt. We model block discovery as a Poisson process using your
            hashrate and BCH2’s current difficulty from the public explorer. Expected daily coins assume a proportional
            share of the block subsidy over time. Profit subtracts electricity only—not hardware, pool fees, or
            downtime.
          </p>
          <details>
            <summary>See the calculation</summary>
            <code>P(block in t) = 1 − e^(− hashrate × t ÷ (difficulty × 2³²))</code>
            <p>
              Expected blocks are the Poisson mean over a day, week, month, and year. Daily revenue is network share ×
              blocks per day × subsidy × USD price.
            </p>
          </details>
        </div>
      </section>

      <footer>
        <span>Hash Horizon · BCH2</span>
        <span>Verify · Measure · Decide</span>
      </footer>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <span />
      <p>Reading the latest BCH2 network target…</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-state" role="alert">
      <span>Signal interrupted</span>
      <p>The BCH2 explorer did not answer. No estimated figures have been substituted.</p>
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
        Network:{" "}
        <a href={network.sourceUrl} target="_blank" rel="noreferrer">
          {network.source}
        </a>
        {network.priceSource ? ` · Price: ${network.priceSource}` : ""}
      </p>
      <time dateTime={network.updatedAt}>{clock}</time>
    </div>
  );
}
