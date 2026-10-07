export const API_BASE: string =
  import.meta.env.VITE_API_BASE ?? "https://explorer.bch2.org/api";

export const EXPLORER_BASE: string =
  import.meta.env.VITE_EXPLORER_BASE ?? "https://explorer.bch2.org";

export const ADDRESS_PREFIX = "bitcoincashii";

export interface Prevout {
  value: number;
  scriptpubkey: string;
  scriptpubkey_address?: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
}

export interface Vin {
  txid: string;
  vout: number;
  is_coinbase: boolean;
  prevout: Prevout | null;
  scriptsig: string;
  scriptsig_asm: string;
  sequence: number;
}

export type Vout = Prevout;

export interface TxStatus {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
}

export interface Tx {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  fee: number;
  vin: Vin[];
  vout: Vout[];
  status: TxStatus;
}

export interface Outspend {
  spent: boolean;
  txid?: string;
  vin?: number;
  status?: TxStatus;
}

export interface Block {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  bits: number;
  nonce: number;
  difficulty: number;
  merkle_root: string;
  tx_count: number;
  size: number;
  previousblockhash?: string;
  mediantime: number;
  extras?: {
    reward?: number;
    totalFees?: number;
    medianFee?: number;
    pool?: { id: number; name: string; slug: string };
  };
}

export interface MempoolRecentTx {
  txid: string;
  fee: number;
  vsize: number;
  value: number;
  time?: number;
}

export interface AddressStats {
  funded_txo_count: number;
  spent_txo_count: number;
  tx_count: number;
}

export interface AddressInfo {
  address: string;
  chain_stats: AddressStats;
  mempool_stats: AddressStats;
}

export type MiningPeriod = "1w" | "1m" | "3m" | "1y" | "all";

export interface HashrateHistory {
  hashrates: { timestamp: number; avgHashrate: number }[];
  difficulty: { time: number; height: number; difficulty: number; adjustment: number }[];
  currentHashrate: number;
  currentDifficulty: number;
}

export interface PoolStats {
  pools: {
    poolId: number;
    name: string;
    link: string;
    slug: string;
    rank: number;
    blockCount: number;
    emptyBlocks: number;
  }[];
  blockCount: number;
}

export interface MempoolSummary {
  count: number;
  vsize: number;
  total_fee: number;
}

export type Prices = { time: number } & Record<string, number>;

export class NotFoundError extends Error {}

async function request(path: string, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (res.status === 404) throw new NotFoundError(`Not found: ${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body.trim() || `Request failed (${res.status})`);
  }
  return res;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return (await request(path, signal)).json() as Promise<T>;
}

async function getText(path: string, signal?: AbortSignal): Promise<string> {
  return (await (await request(path, signal)).text()).trim();
}

export const api = {
  tipHeight: async (signal?: AbortSignal) =>
    Number(await getText("/blocks/tip/height", signal)),
  tx: (txid: string, signal?: AbortSignal) => getJson<Tx>(`/tx/${txid}`, signal),
  txHex: (txid: string, signal?: AbortSignal) => getText(`/tx/${txid}/hex`, signal),
  outspends: (txid: string, signal?: AbortSignal) =>
    getJson<Outspend[]>(`/tx/${txid}/outspends`, signal),
  block: (hash: string, signal?: AbortSignal) => getJson<Block>(`/block/${hash}`, signal),
  blockHashAtHeight: (height: number, signal?: AbortSignal) =>
    getText(`/block-height/${height}`, signal),
  // Esplora pages block transactions in fixed chunks of 25; start must be a multiple of 25.
  blockTxs: (hash: string, start: number, signal?: AbortSignal) =>
    getJson<Tx[]>(`/block/${hash}/txs/${start}`, signal),
  recentBlocks: (signal?: AbortSignal) => getJson<Block[]>("/v1/blocks", signal),
  /** Returns up to 15 blocks, starting at `height` and going down. */
  blocksFrom: (height: number, signal?: AbortSignal) =>
    getJson<Block[]>(`/v1/blocks/${height}`, signal),
  hashrate: (period: MiningPeriod, signal?: AbortSignal) =>
    getJson<HashrateHistory>(`/v1/mining/hashrate/${period}`, signal),
  pools: (period: MiningPeriod, signal?: AbortSignal) =>
    getJson<PoolStats>(`/v1/mining/pools/${period}`, signal),
  mempool: (signal?: AbortSignal) => getJson<MempoolSummary>("/mempool", signal),
  prices: (signal?: AbortSignal) => getJson<Prices>("/v1/prices", signal),
  circulatingSupply: async (signal?: AbortSignal) =>
    Number(await getText("/v1/circulating-supply", signal)),
  maxSupply: async (signal?: AbortSignal) => Number(await getText("/v1/max-supply", signal)),
  mempoolRecent: (signal?: AbortSignal) =>
    getJson<MempoolRecentTx[]>("/mempool/recent", signal),
  address: (address: string, signal?: AbortSignal) =>
    getJson<AddressInfo>(`/address/${addressPath(address)}`, signal),
  addressTxs: (address: string, afterTxid?: string, signal?: AbortSignal) =>
    getJson<Tx[]>(
      `/address/${addressPath(address)}/txs${afterTxid ? `?after_txid=${afterTxid}` : ""}`,
      signal,
    ),
};

// Requests with the "bitcoincashii:" prefix in the path fail CORS in browsers, so send it bare.
function addressPath(address: string): string {
  const prefix = `${ADDRESS_PREFIX}:`;
  return encodeURIComponent(address.startsWith(prefix) ? address.slice(prefix.length) : address);
}

export const BLOCK_TX_PAGE_SIZE = 25;
