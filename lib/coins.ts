export type CoinId = "btc" | "bch" | "bch2" | "btcb2" | "bc3" | "prl";

export type Coin = {
  id: CoinId;
  ticker: string;
  alias?: string;
  name: string;
  algorithm: string;
  hardware: string;
  brief: string;
  defaultValue: string;
  defaultUnit: HashUnit;
  defaultWatts: string;
  sourceUrl: string;
  sourceLabel: string;
  marketUrl?: string;
  marketLabel?: string;
  accent: string;
  workFactor: number;
  geckoId?: string;
  genesisSubsidy: number;
  halvingInterval: number | null;
};

export const HASH_UNITS = ["H/s", "kH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s"] as const;
export type HashUnit = (typeof HASH_UNITS)[number];

export const UNIT_MULTIPLIERS: Record<HashUnit, number> = {
  "H/s": 1,
  "kH/s": 1e3,
  "MH/s": 1e6,
  "GH/s": 1e9,
  "TH/s": 1e12,
  "PH/s": 1e15,
  "EH/s": 1e18,
};

export const COINS: Coin[] = [
  {
    id: "bch2",
    ticker: "BCH2",
    name: "Bitcoin Cash II",
    algorithm: "SHA-256d",
    hardware: "SHA-256 ASIC",
    brief:
      "Bitcoin Cash II is a SHA-256 proof-of-work chain with 10-minute blocks, a 21M cap, and no premine or developer fee. Bitaxe-class miners and larger ASICs can solo mine; GPUs and CPUs are possible but not competitive.",
    defaultValue: "1",
    defaultUnit: "TH/s",
    defaultWatts: "18",
    sourceUrl: "https://bch2explorer.com/api/",
    sourceLabel: "BCH2 Explorer",
    marketUrl: "https://nonkyc.io/market/BCH2_USDT",
    marketLabel: "Trade BCH2 on NonKYC",
    accent: "#0d9f6e",
    workFactor: 2 ** 32,
    geckoId: "bitcoin-cash-ii",
    genesisSubsidy: 50,
    halvingInterval: 210_000,
  },
  {
    id: "bch",
    ticker: "BCH",
    name: "Bitcoin Cash",
    algorithm: "SHA-256d",
    hardware: "SHA-256 ASIC",
    brief: "Mined with the same SHA-256 ASIC family as Bitcoin. Modern Antminer, WhatsMiner, Avalon and Bitaxe hardware can connect.",
    defaultValue: "100",
    defaultUnit: "TH/s",
    defaultWatts: "3500",
    sourceUrl: "https://solofury.com/api/network",
    sourceLabel: "SoloFury full node",
    accent: "#7bc5a0",
    workFactor: 2 ** 32,
    geckoId: "bitcoin-cash",
    genesisSubsidy: 50,
    halvingInterval: 210_000,
  },
  {
    id: "btc",
    ticker: "BTC",
    name: "Bitcoin",
    algorithm: "SHA-256d",
    hardware: "SHA-256 ASIC",
    brief: "Industrial SHA-256 ASIC territory. Smaller miners can participate, but solo discovery remains lottery-scale at ordinary hashrates.",
    defaultValue: "200",
    defaultUnit: "TH/s",
    defaultWatts: "3500",
    sourceUrl: "https://solofury.com/api-btc/network",
    sourceLabel: "SoloFury full node",
    accent: "#f7931a",
    workFactor: 2 ** 32,
    geckoId: "bitcoin",
    genesisSubsidy: 50,
    halvingInterval: 210_000,
  },
  {
    id: "btcb2",
    ticker: "BTCB2",
    alias: "XBT",
    name: "Bitcoin · BLAKE2b",
    algorithm: "BLAKE2b",
    hardware: "BLAKE2b / Sia ASIC",
    brief: "Uses BLAKE2b rather than SHA-256. Listed as XBT on Neoxa Exchange. Sia-class ASICs are the practical choice; SHA-256 miners cannot mine this chain.",
    defaultValue: "10",
    defaultUnit: "TH/s",
    defaultWatts: "3400",
    sourceUrl: "https://b2pool.io/api/v1/public/network",
    sourceLabel: "B2Pool full node",
    marketUrl: "https://neoxa.exchange/",
    marketLabel: "Trade XBT on Neoxa",
    accent: "#76a7ff",
    workFactor: 2 ** 32,
    genesisSubsidy: 50,
    halvingInterval: 210_000,
  },
  {
    id: "bc3",
    ticker: "BC3",
    name: "Bitcoin III",
    algorithm: "SHA3-256t",
    hardware: "CPU + GPU",
    brief: "Designed for commodity CPUs and NVIDIA or AMD GPUs. No purpose-built compatible ASIC inventory currently exists.",
    defaultValue: "500",
    defaultUnit: "MH/s",
    defaultWatts: "250",
    sourceUrl: "https://argfamining.com/api/bc3/network",
    sourceLabel: "ArgfaMining BC3 node",
    accent: "#d18cff",
    workFactor: 2 ** 32,
    genesisSubsidy: 50,
    halvingInterval: 210_000,
  },
  {
    id: "prl",
    ticker: "PRL",
    name: "Pearl",
    algorithm: "PearlHash · PoUW",
    hardware: "Tensor-capable GPU",
    brief: "Proof-of-useful-work built around matrix multiplication. Modern GPUs are the target; miner support and performance vary by vendor.",
    defaultValue: "200",
    defaultUnit: "TH/s",
    defaultWatts: "350",
    sourceUrl: "https://pearlpool.cloud/api/v1/stats",
    sourceLabel: "PearlPool / WhatToMine",
    accent: "#f1eee7",
    workFactor: 2 ** 48,
    geckoId: "pearl-2",
    genesisSubsidy: 0,
    halvingInterval: null,
  },
];

export const COIN_BY_ID = Object.fromEntries(COINS.map((coin) => [coin.id, coin])) as Record<CoinId, Coin>;

export function resolveCoinId(value: string): CoinId | null {
  const normalized = value.toLowerCase();
  if (normalized === "btc2b" || normalized === "btcb2" || normalized === "xbt") return "btcb2";
  return COINS.some((coin) => coin.id === normalized) ? (normalized as CoinId) : null;
}

export function coinPriceLabel(coin: Coin): string {
  return coin.alias ?? coin.ticker;
}

export function toHashrateInput(hashesPerSecond: number): { value: string; unit: HashUnit } {
  const units: HashUnit[] = ["EH/s", "PH/s", "TH/s", "GH/s", "MH/s", "kH/s", "H/s"];
  for (const unit of units) {
    const scaled = hashesPerSecond / UNIT_MULTIPLIERS[unit];
    if (scaled >= 1 || unit === "H/s") {
      const digits = scaled >= 100 ? 1 : scaled >= 10 ? 2 : 3;
      const value = scaled.toLocaleString("en-US", {
        maximumFractionDigits: digits,
        useGrouping: false,
      });
      return { value, unit };
    }
  }
  return { value: "0", unit: "H/s" };
}
