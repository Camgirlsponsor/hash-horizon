import { UNIT_MULTIPLIERS, type HashUnit } from "@/lib/coins";
import type { NetworkSnapshot } from "@/lib/network";

export const HORIZONS = [
  { label: "Day", seconds: 86_400 },
  { label: "Week", seconds: 604_800 },
  { label: "Month", seconds: 2_592_000 },
  { label: "Year", seconds: 31_557_600 },
] as const;

export type HorizonOdds = {
  label: string;
  seconds: number;
  chance: number;
  expectedBlocks: number;
  expectedCoins: number | null;
};

export type Odds = {
  expectedSeconds: number;
  chancePerBlock: number;
  networkShare: number;
  oneInBlocks: number;
  blocksPerDay: number;
  horizons: HorizonOdds[];
};

export function toHashesPerSecond(value: number, unit: HashUnit): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value * UNIT_MULTIPLIERS[unit];
}

export function probabilityForPeriod(hashrate: number, difficulty: number, workFactor: number, seconds: number): number {
  if (hashrate <= 0 || difficulty <= 0 || workFactor <= 0 || seconds <= 0) return 0;
  const lambda = (hashrate * seconds) / (difficulty * workFactor);
  return Math.min(1, -Math.expm1(-lambda));
}

export function expectedBlocksForPeriod(hashrate: number, difficulty: number, workFactor: number, seconds: number): number {
  if (hashrate <= 0 || difficulty <= 0 || workFactor <= 0 || seconds <= 0) return 0;
  return (hashrate * seconds) / (difficulty * workFactor);
}

export function calculateOdds(hashrate: number, snapshot: NetworkSnapshot): Odds {
  const expectedSeconds = hashrate > 0 ? (snapshot.difficulty * snapshot.workFactor) / hashrate : Infinity;
  const networkShare = hashrate > 0 ? Math.min(1, hashrate / snapshot.networkHashrate) : 0;
  const blocksPerDay = expectedBlocksForPeriod(hashrate, snapshot.difficulty, snapshot.workFactor, 86_400);

  return {
    expectedSeconds,
    chancePerBlock: networkShare,
    networkShare,
    oneInBlocks: networkShare > 0 ? 1 / networkShare : Infinity,
    blocksPerDay,
    horizons: HORIZONS.map((horizon) => {
      const expectedBlocks = expectedBlocksForPeriod(hashrate, snapshot.difficulty, snapshot.workFactor, horizon.seconds);
      return {
        ...horizon,
        expectedBlocks,
        chance: probabilityForPeriod(hashrate, snapshot.difficulty, snapshot.workFactor, horizon.seconds),
        expectedCoins: snapshot.blockReward ? expectedBlocks * snapshot.blockReward : null,
      };
    }),
  };
}

export function formatProbability(chance: number): string {
  if (!Number.isFinite(chance) || chance <= 0) return "0%";
  const percent = chance * 100;
  if (percent >= 99.995) return ">99.99%";
  if (percent >= 1) return `${percent.toFixed(2)}%`;
  if (percent >= 0.01) return `${percent.toFixed(3)}%`;
  if (percent >= 0.000001) return `${percent.toFixed(6)}%`;
  return `${percent.toExponential(2)}%`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "∞";
  if (seconds < 60) return `${seconds.toFixed(1)} sec`;
  if (seconds < 3_600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86_400) return `${(seconds / 3_600).toFixed(1)} hr`;
  if (seconds < 31_557_600) return `${(seconds / 86_400).toFixed(1)} days`;
  const years = seconds / 31_557_600;
  if (years < 1_000) return `${years.toFixed(years < 10 ? 1 : 0)} years`;
  return `${years.toExponential(2)} years`;
}

export function formatHashrate(value: number): string {
  const units = [
    ["EH/s", 1e18],
    ["PH/s", 1e15],
    ["TH/s", 1e12],
    ["GH/s", 1e9],
    ["MH/s", 1e6],
    ["kH/s", 1e3],
    ["H/s", 1],
  ] as const;
  const [unit, divisor] = units.find(([, size]) => value >= size) ?? units.at(-1)!;
  return `${(value / divisor).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`;
}

export function formatExpectedBlocks(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (value >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (value >= 0.01) return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return Number(value.toPrecision(2)).toString();
}

export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  if (abs >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (abs === 0) return "0";
  return value.toPrecision(3);
}
