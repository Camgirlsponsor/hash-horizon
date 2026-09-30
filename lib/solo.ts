import type { NetworkSnapshot } from "@/lib/network";
import { calculateOdds, expectedBlocksForPeriod, probabilityForPeriod, type Odds } from "@/lib/probability";
import { calculateProfit, type ProfitEstimate } from "@/lib/profit";

export const LEDGER_PERIODS = [
  { label: "Hour", seconds: 3_600 },
  { label: "Day", seconds: 86_400 },
  { label: "Week", seconds: 604_800 },
  { label: "Month", seconds: 2_592_000 },
  { label: "Year", seconds: 31_557_600 },
] as const;

export type LedgerRow = {
  label: string;
  seconds: number;
  expectedBlocks: number;
  chance: number;
  coins: number;
  revenue: number | null;
  cost: number;
  profit: number | null;
};

export type HalvingOutlook = {
  blocksRemaining: number;
  currentReward: number;
  nextReward: number;
  secondsRemaining: number;
};

export type SoloReport = {
  effectiveHashrate: number;
  effectiveWatts: number;
  joulesPerTerahash: number | null;
  odds: Odds;
  profit: ProfitEstimate;
  luckySeconds: number;
  medianSeconds: number;
  patientSeconds: number;
  blockValueUsd: number | null;
  powerUntilBlock: number | null;
  hardwareUsd: number;
  paybackDays: number | null;
  ledger: LedgerRow[];
  halving: HalvingOutlook | null;
  coinsPerDayAfterHalving: number | null;
  pool: {
    feePercent: number;
    coinsPerDay: number;
    revenuePerDay: number | null;
    profitPerDay: number | null;
  };
};

export function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, value);
}

export function scaleRig(amountEach: number, miners: number, uptimePercent: number): number {
  if (!Number.isFinite(amountEach) || amountEach <= 0) return 0;
  if (!Number.isFinite(miners) || miners <= 0) return 0;
  return amountEach * miners * (clampPercent(uptimePercent) / 100);
}

export function timeUntilProbability(expectedSeconds: number, probability: number): number {
  if (!Number.isFinite(expectedSeconds) || expectedSeconds <= 0) return Infinity;
  if (!Number.isFinite(probability) || probability <= 0) return 0;
  if (probability >= 1) return Infinity;
  return -Math.log(1 - probability) * expectedSeconds;
}

export function halvingOutlook(
  height: number,
  interval: number | null,
  genesis: number,
  blockTime: number,
): HalvingOutlook | null {
  if (!interval || interval <= 0 || genesis <= 0 || !Number.isFinite(height) || height < 0) return null;
  const era = Math.floor(height / interval);
  if (era >= 64) {
    return { blocksRemaining: 0, currentReward: 0, nextReward: 0, secondsRemaining: 0 };
  }
  const currentReward = genesis / 2 ** era;
  const nextReward = genesis / 2 ** (era + 1);
  const blocksRemaining = (era + 1) * interval - height;
  return {
    blocksRemaining,
    currentReward,
    nextReward,
    secondsRemaining: blocksRemaining * (Number.isFinite(blockTime) && blockTime > 0 ? blockTime : 0),
  };
}

export function buildSoloReport(input: {
  hashrateEach: number;
  miners: number;
  wattsEach: number;
  uptimePercent: number;
  kwhPrice: number;
  priceUsd: number | null;
  hardwareUsd: number;
  poolFeePercent: number;
  snapshot: NetworkSnapshot;
  halvingInterval: number | null;
  genesisSubsidy: number;
}): SoloReport {
  const effectiveHashrate = scaleRig(input.hashrateEach, input.miners, input.uptimePercent);
  const effectiveWatts = scaleRig(input.wattsEach, input.miners, input.uptimePercent);
  const terahashEach = input.hashrateEach / 1e12;
  const joulesPerTerahash =
    terahashEach > 0 && input.wattsEach > 0 ? input.wattsEach / terahashEach : null;
  const odds = calculateOdds(effectiveHashrate, input.snapshot);
  const profit = calculateProfit(
    effectiveHashrate,
    effectiveWatts,
    input.kwhPrice,
    input.snapshot,
    input.priceUsd,
  );
  const reward = input.snapshot.blockReward;
  const blockValueUsd = reward && input.priceUsd && input.priceUsd > 0 ? reward * input.priceUsd : null;
  const powerUntilBlock = Number.isFinite(odds.expectedSeconds)
    ? profit.costPerDay * (odds.expectedSeconds / 86_400)
    : null;
  const paybackDays =
    input.hardwareUsd > 0 && profit.profitPerDay != null && profit.profitPerDay > 0
      ? input.hardwareUsd / profit.profitPerDay
      : null;
  const fee = clampPercent(input.poolFeePercent);
  const poolCoins = profit.coinsPerDay * (1 - fee / 100);
  const poolRevenue = input.priceUsd && input.priceUsd > 0 ? poolCoins * input.priceUsd : null;
  const halving = halvingOutlook(
    input.snapshot.blockHeight,
    input.halvingInterval,
    input.genesisSubsidy,
    input.snapshot.blockTime,
  );

  return {
    effectiveHashrate,
    effectiveWatts,
    joulesPerTerahash,
    odds,
    profit,
    luckySeconds: timeUntilProbability(odds.expectedSeconds, 0.1),
    medianSeconds: timeUntilProbability(odds.expectedSeconds, 0.5),
    patientSeconds: timeUntilProbability(odds.expectedSeconds, 0.9),
    blockValueUsd,
    powerUntilBlock,
    hardwareUsd: input.hardwareUsd > 0 ? input.hardwareUsd : 0,
    paybackDays,
    ledger: LEDGER_PERIODS.map((period) => {
      const expectedBlocks = expectedBlocksForPeriod(
        effectiveHashrate,
        input.snapshot.difficulty,
        input.snapshot.workFactor,
        period.seconds,
      );
      const coins = reward ? expectedBlocks * reward : 0;
      const revenue = input.priceUsd && input.priceUsd > 0 ? coins * input.priceUsd : null;
      const cost = profit.costPerDay * (period.seconds / 86_400);
      return {
        ...period,
        expectedBlocks,
        chance: probabilityForPeriod(
          effectiveHashrate,
          input.snapshot.difficulty,
          input.snapshot.workFactor,
          period.seconds,
        ),
        coins,
        revenue,
        cost,
        profit: revenue != null ? revenue - cost : null,
      };
    }),
    halving,
    coinsPerDayAfterHalving:
      halving && halving.currentReward > 0 ? profit.coinsPerDay * (halving.nextReward / halving.currentReward) : null,
    pool: {
      feePercent: fee,
      coinsPerDay: poolCoins,
      revenuePerDay: poolRevenue,
      profitPerDay: poolRevenue != null ? poolRevenue - profit.costPerDay : null,
    },
  };
}
