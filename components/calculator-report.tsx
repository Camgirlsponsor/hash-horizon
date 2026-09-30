import type { Coin } from "@/lib/coins";
import type { NetworkSnapshot } from "@/lib/network";
import { formatCoins, formatUsd } from "@/lib/profit";
import {
  formatCompactNumber,
  formatDuration,
  formatExpectedBlocks,
  formatHashrate,
  formatProbability,
} from "@/lib/probability";
import type { SoloReport } from "@/lib/solo";

export function CalculatorReport({
  coin,
  network,
  report,
}: {
  coin: Coin;
  network: NetworkSnapshot;
  report: SoloReport;
}) {
  const { odds, profit } = report;
  const oneIn = odds.oneInBlocks >= 1e9 ? odds.oneInBlocks.toExponential(2) : formatCompactNumber(odds.oneInBlocks);
  const netTone = profit.profitPerDay == null ? "" : profit.profitPerDay >= 0 ? "is-profit" : "is-loss";

  return (
    <div className="calculator-report">
      <section className="result-panel" aria-live="polite">
        <div className="result-primary">
          <span>Average time to a block</span>
          <strong>{formatDuration(odds.expectedSeconds)}</strong>
          <p>
            A long-run average at {formatHashrate(report.effectiveHashrate)} after uptime. Each hash is still
            independent.
          </p>
        </div>
        <div className="luck-grid">
          <LuckMark label="Lucky 10%" detail="find a block this soon" seconds={report.luckySeconds} />
          <LuckMark label="Even odds" detail="half of miners have one" seconds={report.medianSeconds} />
          <LuckMark label="90% have one" detail="the patient end of the wait" seconds={report.patientSeconds} />
        </div>
      </section>

      <section className="insight-grid" aria-label="Rig snapshot">
        <Insight label="Chance next block" value={formatProbability(odds.chancePerBlock)} note={`about 1 in ${oneIn}`} />
        <Insight
          label="Effective hashrate"
          value={formatHashrate(report.effectiveHashrate)}
          note={`${formatProbability(odds.networkShare)} of the network`}
        />
        <Insight
          label="Efficiency"
          value={report.joulesPerTerahash != null ? `${report.joulesPerTerahash.toLocaleString("en-US", { maximumFractionDigits: 1 })} J/TH` : "—"}
          note="nameplate, before uptime"
        />
        <Insight
          label="One block"
          value={report.blockValueUsd != null ? formatUsd(report.blockValueUsd) : "—"}
          note={network.blockReward != null ? `${network.blockReward} ${coin.ticker} subsidy` : "reward unavailable"}
        />
        <Insight
          label="Power until a block"
          value={formatUsd(report.powerUntilBlock)}
          note="electricity over the average wait"
        />
        <Insight
          label="Break-even power"
          value={profit.breakEvenKwh != null ? `${formatUsd(profit.breakEvenKwh)}/kWh` : "—"}
          note="rate where net profit is zero"
        />
        <Insight
          label="Net per day"
          value={formatUsd(profit.profitPerDay)}
          note={profit.profitPerMonth != null ? `${formatUsd(profit.profitPerMonth)} over 30 days` : "needs a USD price"}
          tone={netTone}
        />
        <Insight
          label="Hardware payback"
          value={
            report.hardwareUsd <= 0 ? "—" : report.paybackDays != null ? formatDuration(report.paybackDays * 86_400) : "Never"
          }
          note={
            report.hardwareUsd <= 0
              ? "enter a hardware cost"
              : report.paybackDays != null
                ? "from net profit, not resale"
                : "expected coins do not cover power"
          }
        />
      </section>

      <section className="outlook" aria-labelledby="outlook-title">
        <div className="section-kicker">
          <span>Expected ledger</span>
          <span>Long-run averages, not a schedule</span>
        </div>
        <h2 id="outlook-title">What this rig returns</h2>
        <div className="outlook-wrap">
          <table className="outlook-table">
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Blocks</th>
                <th scope="col">Chance of at least one</th>
                <th scope="col">Coins</th>
                <th scope="col">Revenue</th>
                <th scope="col">Power</th>
                <th scope="col">Net</th>
              </tr>
            </thead>
            <tbody>
              {report.ledger.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{formatExpectedBlocks(row.expectedBlocks)}</td>
                  <td>{formatProbability(row.chance)}</td>
                  <td>{formatCoins(row.coins, coin.ticker)}</td>
                  <td>{formatUsd(row.revenue)}</td>
                  <td>{formatUsd(row.cost)}</td>
                  <td className={row.profit == null ? "" : row.profit >= 0 ? "is-profit" : "is-loss"}>{formatUsd(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="compare-grid" aria-label="Solo and pool expected value">
        <article>
          <span>Solo</span>
          <strong>{formatCoins(profit.coinsPerDay, coin.ticker)}</strong>
          <p>
            per day on average · {formatUsd(profit.revenuePerDay)} revenue · {formatUsd(profit.profitPerDay)} after power.
            You keep the full subsidy when a block lands.
          </p>
        </article>
        <article>
          <span>Pool at {report.pool.feePercent}% fee</span>
          <strong>{formatCoins(report.pool.coinsPerDay, coin.ticker)}</strong>
          <p>
            per day on average · {formatUsd(report.pool.revenuePerDay)} revenue · {formatUsd(report.pool.profitPerDay)} after
            power. Steadier payout, smaller by the fee.
          </p>
        </article>
      </section>

      {report.halving && (
        <section className="halving-strip" aria-label="Next halving">
          <div>
            <span>Next halving</span>
            <strong>{report.halving.blocksRemaining.toLocaleString("en-US")} blocks</strong>
            <small>about {formatDuration(report.halving.secondsRemaining)} at the current interval</small>
          </div>
          <div>
            <span>Subsidy</span>
            <strong>
              {report.halving.currentReward} → {report.halving.nextReward} {coin.ticker}
            </strong>
            <small>
              {report.coinsPerDayAfterHalving != null
                ? `same share would earn ${formatCoins(report.coinsPerDayAfterHalving, coin.ticker)} / day`
                : "reward follows the Bitcoin-style schedule"}
            </small>
          </div>
        </section>
      )}
    </div>
  );
}

function LuckMark({ label, detail, seconds }: { label: string; detail: string; seconds: number }) {
  return (
    <div className="luck-mark">
      <span>{label}</span>
      <strong>{formatDuration(seconds)}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Insight({
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
    <div className={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
