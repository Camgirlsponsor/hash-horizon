import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../api";
import { blockRewardAt, formatHashrate } from "../format";
import {
  HASH_UNITS,
  buildSoloReport,
  formatBch2,
  formatBlocks,
  formatChance,
  formatMoney,
  formatOneIn,
  formatWait,
  toHashesPerSecond,
  type HashUnit,
  type MiningNetwork,
} from "../mining";
import { useAsync } from "../useAsync";
import { ErrorNotice, Loading } from "./common";

const REFRESH_MS = 60_000;
const BLOCK_TIME_SAMPLE = 1008;

const PRESETS: { label: string; value: string; unit: HashUnit; watts: string }[] = [
  { label: "Bitaxe", value: "1", unit: "TH/s", watts: "18" },
  { label: "S9", value: "14", unit: "TH/s", watts: "1320" },
  { label: "S19", value: "95", unit: "TH/s", watts: "3250" },
  { label: "S21", value: "200", unit: "TH/s", watts: "3500" },
];

function num(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitize(value: string): string {
  return value.replace(/[^0-9.eE+-]/g, "");
}

function formatPriceInput(value: number): string {
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return Number(value.toPrecision(4)).toString();
}

async function loadNetwork(signal: AbortSignal): Promise<MiningNetwork> {
  const [hash, prices, recent] = await Promise.all([
    api.hashrate("1w", signal),
    api.prices(signal),
    api.recentBlocks(signal),
  ]);
  const tip = recent[0];
  const [older] = await api.blocksFrom(tip.height - BLOCK_TIME_SAMPLE, signal);
  const blockTime =
    older && tip.height > older.height
      ? (tip.timestamp - older.timestamp) / (tip.height - older.height)
      : 600;
  return {
    difficulty: hash.currentDifficulty,
    networkHashrate: hash.currentHashrate,
    blockHeight: tip.height,
    blockTime,
    blockReward: blockRewardAt(tip.height),
    priceUsd: prices.USD > 0 ? prices.USD : null,
  };
}

export function SoloPage() {
  const network = useAsync(loadNetwork, [], REFRESH_MS);
  const [hashrate, setHashrate] = useState("50");
  const [unit, setUnit] = useState<HashUnit>("TH/s");
  const [miners, setMiners] = useState("1");
  const [watts, setWatts] = useState("1500");
  const [uptime, setUptime] = useState("100");
  const [kwh, setKwh] = useState("0.12");
  const [hardware, setHardware] = useState("");
  const [poolFee, setPoolFee] = useState("1");
  const [price, setPrice] = useState("");
  const priceDirty = useRef(false);

  useEffect(() => {
    if (!priceDirty.current && network.data?.priceUsd) {
      setPrice(formatPriceInput(network.data.priceUsd));
    }
  }, [network.data?.priceUsd]);

  const hashrateEach = toHashesPerSecond(num(hashrate), unit);
  const terahash = hashrateEach / 1e12;
  const joules = terahash > 0 && num(watts) > 0 ? num(watts) / terahash : null;
  const typedPrice = num(price);
  const report = network.data
    ? buildSoloReport({
        hashrateEach,
        miners: num(miners),
        wattsEach: num(watts),
        uptimePercent: num(uptime),
        kwhPrice: num(kwh),
        priceUsd: typedPrice > 0 ? typedPrice : network.data.priceUsd,
        hardwareUsd: num(hardware),
        poolFeePercent: num(poolFee),
        network: network.data,
      })
    : null;

  return (
    <div className="page">
      <section className="card">
        <div className="card-head">
          <h1>Solo chance</h1>
          <span className="muted small">live BCH2 difficulty, hashrate, and price</span>
        </div>
        <p className="hero-sub">
          Same calculator as the solo-chance site: how long this rig should wait for a block, and
          whether the coins cover the power. Averages, not a promise.
        </p>
        <div className="preset-row">
          {PRESETS.map((preset) => {
            const active =
              hashrate === preset.value && unit === preset.unit && watts === preset.watts && miners === "1";
            return (
              <button
                key={preset.label}
                type="button"
                className={active ? "period active" : "period secondary"}
                onClick={() => {
                  setHashrate(preset.value);
                  setUnit(preset.unit);
                  setWatts(preset.watts);
                  setMiners("1");
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="rig-grid">
          <RigField label="Hashrate each">
            <div className="unit-row">
              <input
                value={hashrate}
                inputMode="decimal"
                onChange={(event) => setHashrate(sanitize(event.target.value))}
              />
              <select value={unit} aria-label="Hashrate unit" onChange={(event) => setUnit(event.target.value as HashUnit)}>
                {HASH_UNITS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </RigField>
          <RigField label="Miners">
            <input value={miners} inputMode="decimal" onChange={(event) => setMiners(sanitize(event.target.value))} />
          </RigField>
          <RigField label="Watts each" hint={joules != null ? `${joules.toLocaleString("en-US", { maximumFractionDigits: 1 })} J/TH` : undefined}>
            <input value={watts} inputMode="decimal" onChange={(event) => setWatts(sanitize(event.target.value))} />
          </RigField>
          <RigField label="Uptime %">
            <input value={uptime} inputMode="decimal" onChange={(event) => setUptime(sanitize(event.target.value))} />
          </RigField>
          <RigField label="Electricity $/kWh">
            <input value={kwh} inputMode="decimal" onChange={(event) => setKwh(sanitize(event.target.value))} />
          </RigField>
          <RigField label="BCH2 price USD">
            <input
              value={price}
              inputMode="decimal"
              placeholder="live"
              onChange={(event) => {
                priceDirty.current = true;
                setPrice(sanitize(event.target.value));
              }}
            />
          </RigField>
          <RigField label="Hardware cost USD">
            <input
              value={hardware}
              inputMode="decimal"
              placeholder="optional"
              onChange={(event) => setHardware(sanitize(event.target.value))}
            />
          </RigField>
          <RigField label="Pool fee %">
            <input value={poolFee} inputMode="decimal" onChange={(event) => setPoolFee(sanitize(event.target.value))} />
          </RigField>
        </div>
      </section>

      {network.status === "error" && !network.data && (
        <ErrorNotice error={network.error} what="Network stats" />
      )}
      {!network.data && network.status === "loading" && <Loading label="Reading the BCH2 network…" />}
      {network.data && report && <SoloReport network={network.data} report={report} />}
    </div>
  );
}

function SoloReport({
  network,
  report,
}: {
  network: MiningNetwork;
  report: ReturnType<typeof buildSoloReport>;
}) {
  const tone =
    report.profitPerDay == null ? "" : report.profitPerDay >= 0 ? "pos" : "neg";
  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>Time to a block</h2>
          <span className="muted small">
            network {formatHashrate(network.networkHashrate)} · diff{" "}
            {network.difficulty.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="solo-hero">
          <div>
            <div className="stat-label">Average wait</div>
            <div className="solo-wait">{formatWait(report.expectedSeconds)}</div>
            <p className="muted small">
              At {formatHashrate(report.effectiveHashrate)} after uptime. Each hash is still independent.
            </p>
          </div>
          <div className="luck-grid">
            <Luck label="Lucky 10%" detail="find one this soon" seconds={report.luckySeconds} />
            <Luck label="Even odds" detail="half of miners have one" seconds={report.medianSeconds} />
            <Luck label="90% have one" detail="the patient end" seconds={report.patientSeconds} />
          </div>
        </div>
      </section>

      <section className="stats">
        <Stat label="Chance next block" value={formatChance(report.chancePerBlock)} note={`about 1 in ${formatOneIn(report.oneInBlocks)}`} />
        <Stat label="Effective hashrate" value={formatHashrate(report.effectiveHashrate)} note={`${formatChance(report.chancePerBlock)} of the network`} />
        <Stat
          label="Efficiency"
          value={report.joulesPerTerahash != null ? `${report.joulesPerTerahash.toLocaleString("en-US", { maximumFractionDigits: 1 })} J/TH` : "—"}
          note="nameplate, before uptime"
        />
        <Stat label="One block" value={formatMoney(report.blockValueUsd)} note={`${network.blockReward} BCH2 subsidy`} />
        <Stat label="Power until a block" value={formatMoney(report.powerUntilBlock)} note="electricity over the average wait" />
        <Stat
          label="Break-even power"
          value={report.breakEvenKwh != null ? `${formatMoney(report.breakEvenKwh)}/kWh` : "—"}
          note="rate where profit is zero"
        />
        <Stat label="Net per day" value={formatMoney(report.profitPerDay)} note={report.profitPerMonth != null ? `${formatMoney(report.profitPerMonth)} over 30 days` : "needs a price"} tone={tone} />
        <Stat
          label="Hardware payback"
          value={numHardware(report)}
          note={report.paybackDays != null ? "from net profit, not resale" : "enter a cost, or coins do not cover power"}
        />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Expected ledger</h2>
          <span className="muted small">long-run averages, not a schedule</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Period</th>
              <th className="num">Blocks</th>
              <th className="num">Chance of one</th>
              <th className="num">Coins</th>
              <th className="num">Revenue</th>
              <th className="num">Power</th>
              <th className="num">Net</th>
            </tr>
          </thead>
          <tbody>
            {report.ledger.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="num">{formatBlocks(row.expectedBlocks)}</td>
                <td className="num">{formatChance(row.chance)}</td>
                <td className="num">{formatBch2(row.coins)}</td>
                <td className="num">{formatMoney(row.revenue)}</td>
                <td className="num">{formatMoney(row.cost)}</td>
                <td className={`num ${row.profit == null ? "" : row.profit >= 0 ? "pos" : "neg"}`}>
                  {formatMoney(row.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="compare">
        <article className="card">
          <div className="stat-label">Solo</div>
          <div className="stat-value">{formatBch2(report.coinsPerDay)} / day</div>
          <p className="muted small">
            {formatMoney(report.revenuePerDay)} revenue · {formatMoney(report.profitPerDay)} after power. You keep
            the full subsidy when a block lands.
          </p>
        </article>
        <article className="card">
          <div className="stat-label">Pool at {report.pool.feePercent}%</div>
          <div className="stat-value">{formatBch2(report.pool.coinsPerDay)} / day</div>
          <p className="muted small">
            {formatMoney(report.pool.revenuePerDay)} revenue · {formatMoney(report.pool.profitPerDay)} after power.
            Steadier payout, smaller by the fee.
          </p>
        </article>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Next halving</h2>
        </div>
        <div className="supply">
          <div>
            <div className="stat-label">Blocks remaining</div>
            <div className="stat-value">{report.halving.blocksRemaining.toLocaleString("en-US")}</div>
            <p className="muted small">about {formatWait(report.halving.secondsRemaining)} at the current interval</p>
          </div>
          <div>
            <div className="stat-label">Subsidy</div>
            <div className="stat-value">
              {report.halving.currentReward} → {report.halving.nextReward} BCH2
            </div>
            <p className="muted small">
              the same share would earn {formatBch2(report.halving.coinsPerDayAfter)} / day
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function numHardware(report: ReturnType<typeof buildSoloReport>): string {
  if (report.paybackDays != null) return formatWait(report.paybackDays * 86_400);
  return "—";
}

function Luck({ label, detail, seconds }: { label: string; detail: string; seconds: number }) {
  return (
    <div className="hero-stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{formatWait(seconds)}</div>
      <div className="muted small">{detail}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div className="stat card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone}`}>{value}</div>
      <div className="muted small">{note}</div>
    </div>
  );
}

function RigField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="rig-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
