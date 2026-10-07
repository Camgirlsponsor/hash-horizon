import { blockRewardAt } from "./format";

/** Bitcoin-style work per difficulty unit. Expected hashes per block = difficulty × this. */
export const WORK_FACTOR = 2 ** 32;

export const HASH_UNITS = ["H/s", "kH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s"] as const;
export type HashUnit = (typeof HASH_UNITS)[number];

const UNIT_MULTIPLIERS: Record<HashUnit, number> = {
  "H/s": 1,
  "kH/s": 1e3,
  "MH/s": 1e6,
  "GH/s": 1e9,
  "TH/s": 1e12,
  "PH/s": 1e15,
  "EH/s": 1e18,
};

export const LEDGER_PERIODS = [
  { label: "Hour", seconds: 3_600 },
  { label: "Day", seconds: 86_400 },
  { label: "Week", seconds: 604_800 },
  { label: "Month", seconds: 2_592_000 },
  { label: "Year", seconds: 31_557_600 },
] as const;

export interface MiningNetwork {
  difficulty: number;
  networkHashrate: number;
  blockHeight: number;
  blockTime: number;
  blockReward: number;
  priceUsd: number | null;
}

export interface SoloReport {
  effectiveHashrate: number;
  joulesPerTerahash: number | null;
  expectedSeconds: number;
  chancePerBlock: number;
  oneInBlocks: number;
  luckySeconds: number;
  medianSeconds: number;
  patientSeconds: number;
  blockValueUsd: number | null;
  powerUntilBlock: number | null;
  coinsPerDay: number;
  revenuePerDay: number | null;
  costPerDay: number;
  profitPerDay: number | null;
  profitPerMonth: number | null;
  breakEvenKwh: number | null;
  paybackDays: number | null;
  ledger: {
    label: string;
    expectedBlocks: number;
    chance: number;
    coins: number;
    revenue: number | null;
    cost: number;
    profit: number | null;
  }[];
  pool: {
    feePercent: number;
    coinsPerDay: number;
    revenuePerDay: number | null;
    profitPerDay: number | null;
  };
  halving: {
    blocksRemaining: number;
    currentReward: number;
    nextReward: number;
    secondsRemaining: number;
    coinsPerDayAfter: number;
  };
}

export function toHashesPerSecond(value: number, unit: HashUnit): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value * UNIT_MULTIPLIERS[unit];
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, value);
}

function scaleRig(amountEach: number, miners: number, uptimePercent: number): number {
  if (!Number.isFinite(amountEach) || amountEach <= 0) return 0;
  if (!Number.isFinite(miners) || miners <= 0) return 0;
  return amountEach * miners * (clampPercent(uptimePercent) / 100);
}

function expectedBlocks(hashrate: number, difficulty: number, seconds: number): number {
  if (hashrate <= 0 || difficulty <= 0 || seconds <= 0) return 0;
  return (hashrate * seconds) / (difficulty * WORK_FACTOR);
}

function chanceInPeriod(hashrate: number, difficulty: number, seconds: number): number {
  const lambda = expectedBlocks(hashrate, difficulty, seconds);
  if (lambda <= 0) return 0;
  return Math.min(1, -Math.expm1(-lambda));
}

function waitForChance(expectedSeconds: number, probability: number): number {
  if (!Number.isFinite(expectedSeconds) || expectedSeconds <= 0) return Infinity;
  if (probability <= 0) return 0;
  if (probability >= 1) return Infinity;
  return -Math.log(1 - probability) * expectedSeconds;
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
  network: MiningNetwork;
}): SoloReport {
  const hashrate = scaleRig(input.hashrateEach, input.miners, input.uptimePercent);
  const watts = scaleRig(input.wattsEach, input.miners, input.uptimePercent);
  const terahashEach = input.hashrateEach / 1e12;
  const joulesPerTerahash =
    terahashEach > 0 && input.wattsEach > 0 ? input.wattsEach / terahashEach : null;
  const { difficulty, networkHashrate, blockTime, blockReward, blockHeight } = input.network;
  const expectedSeconds = hashrate > 0 ? (difficulty * WORK_FACTOR) / hashrate : Infinity;
  const share = networkHashrate > 0 ? Math.min(1, Math.max(0, hashrate) / networkHashrate) : 0;
  const blocksPerDay = blockTime > 0 ? 86_400 / blockTime : 0;
  const coinsPerDay = share * blocksPerDay * blockReward;
  const kwhPerDay = (Math.max(0, watts) / 1000) * 24;
  const costPerDay = kwhPerDay * Math.max(0, input.kwhPrice);
  const price = input.priceUsd != null && input.priceUsd > 0 ? input.priceUsd : null;
  const revenuePerDay = price != null ? coinsPerDay * price : null;
  const profitPerDay = revenuePerDay != null ? revenuePerDay - costPerDay : null;
  const fee = clampPercent(input.poolFeePercent);
  const poolCoins = coinsPerDay * (1 - fee / 100);
  const poolRevenue = price != null ? poolCoins * price : null;
  const nextReward = blockRewardAt(blockHeight + 210_000);
  const blocksRemaining =
    (Math.floor(blockHeight / 210_000) + 1) * 210_000 - blockHeight;

  return {
    effectiveHashrate: hashrate,
    joulesPerTerahash,
    expectedSeconds,
    chancePerBlock: share,
    oneInBlocks: share > 0 ? 1 / share : Infinity,
    luckySeconds: waitForChance(expectedSeconds, 0.1),
    medianSeconds: waitForChance(expectedSeconds, 0.5),
    patientSeconds: waitForChance(expectedSeconds, 0.9),
    blockValueUsd: price != null ? blockReward * price : null,
    powerUntilBlock: Number.isFinite(expectedSeconds) ? costPerDay * (expectedSeconds / 86_400) : null,
    coinsPerDay,
    revenuePerDay,
    costPerDay,
    profitPerDay,
    profitPerMonth: profitPerDay != null ? profitPerDay * 30 : null,
    breakEvenKwh: revenuePerDay != null && kwhPerDay > 0 ? revenuePerDay / kwhPerDay : null,
    paybackDays:
      input.hardwareUsd > 0 && profitPerDay != null && profitPerDay > 0
        ? input.hardwareUsd / profitPerDay
        : null,
    ledger: LEDGER_PERIODS.map((period) => {
      const blocks = expectedBlocks(hashrate, difficulty, period.seconds);
      const coins = blocks * blockReward;
      const revenue = price != null ? coins * price : null;
      const cost = costPerDay * (period.seconds / 86_400);
      return {
        label: period.label,
        expectedBlocks: blocks,
        chance: chanceInPeriod(hashrate, difficulty, period.seconds),
        coins,
        revenue,
        cost,
        profit: revenue != null ? revenue - cost : null,
      };
    }),
    pool: {
      feePercent: fee,
      coinsPerDay: poolCoins,
      revenuePerDay: poolRevenue,
      profitPerDay: poolRevenue != null ? poolRevenue - costPerDay : null,
    },
    halving: {
      blocksRemaining,
      currentReward: blockReward,
      nextReward,
      secondsRemaining: blocksRemaining * (blockTime > 0 ? blockTime : 600),
      coinsPerDayAfter: blockReward > 0 ? coinsPerDay * (nextReward / blockReward) : 0,
    },
  };
}

export function formatChance(chance: number): string {
  if (!Number.isFinite(chance) || chance <= 0) return "0%";
  const percent = chance * 100;
  if (percent >= 99.995) return ">99.99%";
  if (percent >= 1) return `${percent.toFixed(2)}%`;
  if (percent >= 0.01) return `${percent.toFixed(3)}%`;
  if (percent >= 0.000001) return `${percent.toFixed(6)}%`;
  return `${percent.toExponential(2)}%`;
}

export function formatWait(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)} sec`;
  if (seconds < 3_600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86_400) return `${(seconds / 3_600).toFixed(1)} hr`;
  if (seconds < 31_557_600) return `${(seconds / 86_400).toFixed(1)} days`;
  const years = seconds / 31_557_600;
  if (years < 1_000) return `${years.toFixed(years < 10 ? 1 : 0)} years`;
  return `${years.toExponential(2)} years`;
}

export function formatMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatBch2(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 BCH2";
  const digits = value >= 100 ? 2 : value >= 1 ? 4 : 6;
  return `${value.toLocaleString("en-US", { maximumFractionDigits: digits })} BCH2`;
}

export function formatBlocks(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (value >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (value >= 0.01) return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return Number(value.toPrecision(2)).toString();
}

export function formatOneIn(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1e9) return value.toExponential(2);
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
