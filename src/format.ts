import { ADDRESS_PREFIX } from "./api";

export const SATS_PER_COIN = 100_000_000;

export function formatCoins(sats: number): string {
  const negative = sats < 0;
  const abs = Math.abs(sats);
  const whole = Math.floor(abs / SATS_PER_COIN);
  const frac = String(abs % SATS_PER_COIN).padStart(8, "0");
  return `${negative ? "-" : ""}${whole.toLocaleString("en-US")}.${frac}`;
}

export function formatSats(sats: number): string {
  return `${sats.toLocaleString("en-US")} sat`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(2)} kB`;
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

export function formatFeeRate(fee: number, size: number): string {
  if (!size) return "-";
  return `${(fee / size).toFixed(2)} sat/B`;
}

export function formatHashrate(hashesPerSecond: number): string {
  const units = ["H/s", "kH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s", "ZH/s"];
  let value = hashesPerSecond;
  let i = 0;
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days >= 365) return `${(days / 365).toFixed(1)} years`;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${s % 60} s`;
  return `${s} s`;
}

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 0,
  });
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const HALVING_INTERVAL = 210_000;
export const INITIAL_REWARD_COINS = 50;

export function blockRewardAt(height: number): number {
  return INITIAL_REWARD_COINS / 2 ** Math.floor(height / HALVING_INTERVAL);
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString();
}

export function formatRelative(unixSeconds: number): string {
  const diff = Math.round(Date.now() / 1000 - unixSeconds);
  if (diff < 0) return "in the future";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86_400)} d ago`;
}

export function shortHash(hash: string, chars = 8): string {
  if (hash.length <= chars * 2 + 1) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}

export function stripPrefix(address: string): string {
  return address.startsWith(`${ADDRESS_PREFIX}:`)
    ? address.slice(ADDRESS_PREFIX.length + 1)
    : address;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 ? `0${hex}` : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Renders bytes as text, replacing non-printable characters with "." */
export function bytesToPrintable(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".";
  return s;
}

/** Decodes the data pushes of an OP_RETURN script, as UTF-8 when it is clean text. */
export function decodeOpReturn(scriptHex: string): string[] {
  const bytes = hexToBytes(scriptHex);
  if (bytes[0] !== 0x6a) return [];
  return scriptPushes(scriptHex).map(describePush);
}

/** Pulls the data pushes out of a Bitcoin script. Opcodes without data are skipped. */
export function scriptPushes(scriptHex: string): Uint8Array[] {
  const bytes = hexToBytes(scriptHex);
  const pushes: Uint8Array[] = [];
  let i = 0;
  while (i < bytes.length) {
    const op = bytes[i++];
    let len: number | undefined;
    if (op >= 0x01 && op <= 0x4b) len = op;
    else if (op === 0x4c && i < bytes.length) len = bytes[i++];
    else if (op === 0x4d && i + 1 < bytes.length) {
      len = bytes[i] | (bytes[i + 1] << 8);
      i += 2;
    } else if (op === 0x4e && i + 3 < bytes.length) {
      len = bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24);
      i += 4;
    }
    if (len === undefined) continue;
    if (i + len > bytes.length) break;
    pushes.push(bytes.slice(i, i + len));
    i += len;
  }
  return pushes;
}

/** Readable ASCII runs of at least 4 characters that contain a letter. */
export function readableStrings(bytes: Uint8Array): string[] {
  const runs: string[] = [];
  let current = "";
  const flush = () => {
    const text = current.trim();
    if (text.length >= 4 && /[A-Za-z]/.test(text)) runs.push(text);
    current = "";
  };
  for (const byte of bytes) {
    if (byte >= 0x20 && byte < 0x7f) current += String.fromCharCode(byte);
    else flush();
  }
  flush();
  return runs;
}

function describePush(data: Uint8Array): string {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    if (/^[\p{L}\p{N}\p{P}\p{S}\p{Zs}\n\r\t]*$/u.test(text)) return text;
  } catch {
    // not valid UTF-8, fall through to hex
  }
  return `0x${Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Locktime below 500,000,000 is a block height; above is a unix timestamp. */
export function describeLocktime(locktime: number): string {
  if (locktime === 0) return "0 (none)";
  if (locktime < 500_000_000) return `${locktime.toLocaleString("en-US")} (block height)`;
  return `${locktime} (${formatDateTime(locktime)})`;
}
