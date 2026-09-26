import { HASH_UNITS, UNIT_MULTIPLIERS } from "@/lib/coins";
import { getNetworkSnapshot, type NetworkSnapshot } from "@/lib/network";
import { calculateProfit, type ProfitEstimate } from "@/lib/profit";

const HASHRATE_NO_PRL = "https://hashrate.no/coins/PRL/benchmarks";
const BENCH_TTL_MS = 10 * 60 * 1000;
const PREFIX: Record<string, number> = {
  h: 1,
  kh: 1e3,
  mh: 1e6,
  gh: 1e9,
  th: 1e12,
  ph: 1e15,
  eh: 1e18,
};

export type GpuBench = {
  slug: string;
  name: string;
  hashrate: number;
  watts: number;
  efficiency: number | null;
};

export type GpuRank = GpuBench & {
  profit: ProfitEstimate;
};

export type GpuLeaderboard = {
  coin: "prl";
  snapshot: NetworkSnapshot;
  gpus: GpuBench[];
  source: string;
  sourceUrl: string;
  updatedAt: string;
};

let cachedBenches: { at: number; gpus: GpuBench[]; sourceUrl: string } | null = null;

export function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function parsePrefixedRate(value: number, prefix: string): number {
  const multiplier = PREFIX[prefix.toLowerCase()] ?? 0;
  return multiplier > 0 ? value * multiplier : 0;
}

export function parseHashrateNoGpuBenches(html: string, coinPath = "PRL"): GpuBench[] {
  const rates = new Map<string, { name: string; hashrate: number }>();
  const wattsBySlug = new Map<string, number>();
  const efficiencyBySlug = new Map<string, number>();
  const rowRe = new RegExp(
    String.raw`<tr[^>]*?/gpus/([^/'"]+)/${coinPath}[^>]*>\s*<td[^>]*>([^<]+)</td>[\s\S]*?>([\d.]+)\s*([A-Za-z]+)/(s|W)\s*<`,
    "gi",
  );

  for (const match of html.matchAll(rowRe)) {
    const slug = match[1];
    const name = decodeHtml(match[2]);
    const value = Number(match[3]);
    const prefix = match[4];
    const kind = match[5].toLowerCase();
    if (!slug || !name || !Number.isFinite(value) || value <= 0) continue;

    if (kind === "s") {
      const hashrate = parsePrefixedRate(value, prefix);
      if (hashrate > 0) rates.set(slug, { name, hashrate });
    } else {
      const hashesPerWatt = parsePrefixedRate(value, prefix);
      if (hashesPerWatt > 0) {
        efficiencyBySlug.set(slug, hashesPerWatt);
        const rate = rates.get(slug);
        if (rate) wattsBySlug.set(slug, rate.hashrate / hashesPerWatt);
      }
    }
  }

  for (const [slug, hashesPerWatt] of efficiencyBySlug) {
    const rate = rates.get(slug);
    if (rate && !wattsBySlug.has(slug)) wattsBySlug.set(slug, rate.hashrate / hashesPerWatt);
  }

  return [...rates.entries()]
    .map(([slug, rate]) => ({
      slug,
      name: rate.name,
      hashrate: rate.hashrate,
      watts: wattsBySlug.get(slug) ?? 0,
      efficiency: efficiencyBySlug.get(slug) ?? null,
    }))
    .sort((a, b) => b.hashrate - a.hashrate);
}

export function rankGpus(gpus: GpuBench[], snapshot: NetworkSnapshot, kwhPrice: number): GpuRank[] {
  return gpus
    .map((gpu) => ({
      ...gpu,
      profit: calculateProfit(gpu.hashrate, gpu.watts, kwhPrice, snapshot),
    }))
    .sort((a, b) => {
      const aProfit = a.profit.profitPerDay ?? Number.NEGATIVE_INFINITY;
      const bProfit = b.profit.profitPerDay ?? Number.NEGATIVE_INFINITY;
      if (bProfit !== aProfit) return bProfit - aProfit;
      return b.profit.coinsPerDay - a.profit.coinsPerDay;
    });
}

export function displayHashrate(hashesPerSecond: number): string {
  const unit = [...HASH_UNITS].reverse().find((item) => hashesPerSecond >= UNIT_MULTIPLIERS[item]) ?? "H/s";
  const scaled = hashesPerSecond / UNIT_MULTIPLIERS[unit];
  const digits = scaled >= 100 ? 1 : scaled >= 10 ? 2 : 3;
  return `${scaled.toLocaleString("en-US", { maximumFractionDigits: digits })} ${unit}`;
}

async function fetchBenchmarkHtml(): Promise<string> {
  const response = await fetch(HASHRATE_NO_PRL, {
    headers: { Accept: "text/html", "User-Agent": "HashHorizon/1.0" },
    signal: AbortSignal.timeout(12_000),
    next: { revalidate: 600 },
  });
  if (!response.ok) throw new Error(`Hashrate.no returned ${response.status}`);
  return response.text();
}

export async function getGpuLeaderboard(): Promise<GpuLeaderboard> {
  const benchFresh = cachedBenches && Date.now() - cachedBenches.at < BENCH_TTL_MS ? cachedBenches : null;
  const [snapshot, html] = await Promise.all([
    getNetworkSnapshot("prl"),
    benchFresh ? Promise.resolve(null) : fetchBenchmarkHtml(),
  ]);

  if (!benchFresh) {
    const gpus = parseHashrateNoGpuBenches(html!);
    if (!gpus.length) throw new Error("Hashrate.no GPU table was empty");
    cachedBenches = { at: Date.now(), gpus, sourceUrl: HASHRATE_NO_PRL };
  }

  const stored = cachedBenches!;
  return {
    coin: "prl",
    snapshot,
    gpus: stored.gpus,
    source: "Hashrate.no PearlHash benches",
    sourceUrl: stored.sourceUrl,
    updatedAt: snapshot.updatedAt,
  };
}
