import { COIN_BY_ID, type Coin, type CoinId } from "@/lib/coins";

export type NetworkSnapshot = {
  coin: CoinId;
  difficulty: number;
  networkHashrate: number;
  blockHeight: number;
  blockTime: number;
  blockReward: number | null;
  priceUsd: number | null;
  priceSource: string | null;
  updatedAt: string;
  source: string;
  sourceUrl: string;
  stale: boolean;
  workFactor: number;
};

type Json = Record<string, unknown>;
const lastGood = new Map<CoinId, NetworkSnapshot>();

export function numberAt(data: Json, ...paths: string[]): number | undefined {
  for (const path of paths) {
    let value: unknown = data;
    for (const part of path.split(".")) {
      if (!value || typeof value !== "object") {
        value = undefined;
        break;
      }
      value = (value as Json)[part];
    }
    const parsed = typeof value === "string" ? Number(value) : value;
    if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
}

export function subsidyFromHeight(height: number, genesis: number, interval: number | null): number | null {
  if (!interval || genesis <= 0 || height < 0) return null;
  const halvings = Math.floor(height / interval);
  if (halvings >= 64) return 0;
  return genesis / 2 ** halvings;
}

async function fetchJson(url: string, timeoutMs = 7_000): Promise<Json> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "SoloChance/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: 30 },
  });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  return (await response.json()) as Json;
}

async function fetchPlainNumber(url: string, timeoutMs = 7_000): Promise<number> {
  const response = await fetch(url, {
    headers: { Accept: "application/json, text/plain", "User-Agent": "SoloChance/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: 30 },
  });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  const text = (await response.text()).trim();
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      const nested = numberAt(parsed as Json, "value", "difficulty", "hashrate", "nethash", "usd");
      if (nested !== undefined) return nested;
    }
  } catch {
    /* plain numeric body */
  }
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error(`Upstream returned a non-numeric body from ${url}`);
  return value;
}

export function normalizeNetworkData(
  data: Json,
  coin: Coin,
  sourceUrl = coin.sourceUrl,
  source = coin.sourceLabel,
): NetworkSnapshot {
  const difficulty = numberAt(
    data,
    "difficulty",
    "network.difficulty",
    "networkDifficulty",
    "pool.networkStats.networkDifficulty",
  );
  const networkHashrate = numberAt(
    data,
    "networkhashps",
    "nethash",
    "hashrate",
    "network.hashrate",
    "network.networkhashps",
    "pool.networkStats.networkHashrate",
  );
  const blockHeight = numberAt(data, "blocks", "height", "last_block", "network.height", "pool.networkStats.blockHeight");
  const suppliedBlockTime = numberAt(data, "blockTime", "block_time", "network.blockTime", "pool.networkStats.blockTime");
  const blockReward =
    numberAt(data, "blockReward", "block_reward", "network.blockReward", "coin.blockReward") ??
    subsidyFromHeight(blockHeight ?? 0, coin.genesisSubsidy, coin.halvingInterval);

  if (!difficulty || !networkHashrate || blockHeight === undefined) {
    throw new Error("Upstream response is missing required network fields");
  }

  const impliedBlockTime = (difficulty * coin.workFactor) / networkHashrate;
  const blockTime =
    suppliedBlockTime && suppliedBlockTime > 0
      ? suppliedBlockTime
      : Number.isFinite(impliedBlockTime) && impliedBlockTime > 0
        ? impliedBlockTime
        : 600;

  return {
    coin: coin.id,
    difficulty,
    networkHashrate,
    blockHeight,
    blockTime,
    blockReward: blockReward && blockReward > 0 ? blockReward : null,
    priceUsd: null,
    priceSource: null,
    updatedAt: new Date().toISOString(),
    source,
    sourceUrl,
    stale: false,
    workFactor: coin.workFactor,
  };
}

async function fetchUsdPrice(coin: Coin): Promise<{ price: number; source: string } | null> {
  if (coin.geckoId) {
    try {
      const data = await fetchJson(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin.geckoId}&vs_currencies=usd`,
        4_000,
      );
      const nested = data[coin.geckoId];
      const price = nested && typeof nested === "object" ? numberAt(nested as Json, "usd") : undefined;
      if (price) return { price, source: "CoinGecko" };
    } catch {
      /* continue to other sources */
    }
  }

  if (coin.id === "btcb2") {
    const neoxa = await fetchNeoxaBtcb2Price();
    if (neoxa) return neoxa;
    try {
      const data = await fetchJson("https://coincodex.com/api/coincodex/get_coin/bitcoin-blake2b");
      const price = numberAt(data, "last_price_usd", "price_usd", "usd", "price");
      if (price) return { price, source: "CoinCodex" };
    } catch {
      /* no live BTCB2 / XBT price available */
    }
  }

  return null;
}

async function fetchNeoxaBtcb2Price(): Promise<{ price: number; source: string } | null> {
  for (const pair of ["BTCB2_USDC", "BTCB2_USDT"] as const) {
    try {
      const data = await fetchJson(`https://neoxa.exchange/api/exchange/ticker/${pair}`);
      const price = numberAt(data, "ticker.lastPrice", "ticker.last", "lastPrice");
      if (price && price > 0) return { price, source: "Neoxa Exchange" };
    } catch {
      /* try the next quoted pair */
    }
  }
  return null;
}

async function enrichEconomics(snapshot: NetworkSnapshot, coin: Coin, raw?: Json): Promise<NetworkSnapshot> {
  const next = { ...snapshot };
  const rawPrice = raw ? numberAt(raw, "price.usd", "priceUsd", "usd") : undefined;
  if (rawPrice) {
    next.priceUsd = rawPrice;
    next.priceSource = coin.id === "bc3" ? "ArgfaMining" : snapshot.source;
  }

  if (!next.priceUsd) {
    const quoted = await fetchUsdPrice(coin);
    if (quoted) {
      next.priceUsd = quoted.price;
      next.priceSource = quoted.source;
    }
  }

  return next;
}

async function fetchPearl(coin: Coin): Promise<NetworkSnapshot> {
  const wtmUrl = "https://whattomine.com/coins/469.json";
  const [wtmRaw, gecko] = await Promise.all([fetchJson(wtmUrl, 5_000).catch(() => null), fetchUsdPrice(coin)]);

  if (!wtmRaw) throw new Error("Pearl network unavailable");
  const snapshot = normalizeNetworkData(wtmRaw, coin, wtmUrl, "WhatToMine · Pearl");

  if (gecko) {
    snapshot.priceUsd = gecko.price;
    snapshot.priceSource = gecko.source;
  } else if (wtmRaw) {
    const btcRate = numberAt(wtmRaw, "exchange_rate");
    if (btcRate) {
      const bitcoin = await fetchUsdPrice(COIN_BY_ID.btc);
      if (bitcoin) {
        snapshot.priceUsd = btcRate * bitcoin.price;
        snapshot.priceSource = "WhatToMine × BTC";
      }
    }
  }

  return snapshot;
}

async function fetchBc3(coin: Coin): Promise<NetworkSnapshot> {
  try {
    const raw = await fetchJson("https://argfamining.com/api/bc3/stats");
    const network = (raw.network && typeof raw.network === "object" ? raw.network : raw) as Json;
    return enrichEconomics(
      normalizeNetworkData(network, coin, "https://argfamining.com/api/bc3/stats", "ArgfaMining BC3 node"),
      coin,
      raw,
    );
  } catch {
    return enrichEconomics(normalizeNetworkData(await fetchJson(coin.sourceUrl), coin), coin);
  }
}

async function fetchBch2(coin: Coin): Promise<NetworkSnapshot> {
  const explorer = "https://bch2explorer.com/api/v1";
  try {
    const [diff, hashrate, height, blockTime, price] = await Promise.all([
      fetchJson(`${explorer}/live-diff`),
      fetchPlainNumber(`${explorer}/hashrate`),
      fetchPlainNumber(`${explorer}/blockcount`),
      fetchPlainNumber(`${explorer}/blocktime`),
      fetchPlainNumber(`${explorer}/lastprice`).catch(() => null),
    ]);

    const difficulty = numberAt(diff, "difficulty");
    if (!difficulty || !(hashrate > 0) || !(height >= 0)) {
      throw new Error("BCH2 explorer response is missing required network fields");
    }

    const snapshot: NetworkSnapshot = {
      coin: coin.id,
      difficulty,
      networkHashrate: hashrate,
      blockHeight: height,
      blockTime: blockTime > 0 ? blockTime : 600,
      blockReward: subsidyFromHeight(height, coin.genesisSubsidy, coin.halvingInterval),
      priceUsd: price && price > 0 ? price : null,
      priceSource: price && price > 0 ? "BCH2 Explorer" : null,
      updatedAt: new Date().toISOString(),
      source: "BCH2 Explorer",
      sourceUrl: "https://explorer.bch2.org",
      stale: false,
      workFactor: coin.workFactor,
    };

    if (!snapshot.priceUsd) {
      return enrichEconomics(snapshot, coin);
    }
    return snapshot;
  } catch {
    const fallbackUrl = "https://solofury.com/api-bch2/network";
    return enrichEconomics(
      normalizeNetworkData(await fetchJson(fallbackUrl), coin, fallbackUrl, "SoloFury full node"),
      coin,
    );
  }
}

export async function getNetworkSnapshot(id: CoinId): Promise<NetworkSnapshot> {
  const coin = COIN_BY_ID[id];
  try {
    let snapshot: NetworkSnapshot;
    if (id === "prl") snapshot = await fetchPearl(coin);
    else if (id === "bc3") snapshot = await fetchBc3(coin);
    else if (id === "bch2") snapshot = await fetchBch2(coin);
    else snapshot = await enrichEconomics(normalizeNetworkData(await fetchJson(coin.sourceUrl), coin), coin);
    lastGood.set(id, snapshot);
    return snapshot;
  } catch (error) {
    const cached = lastGood.get(id);
    if (cached) return { ...cached, stale: true };
    throw error;
  }
}
