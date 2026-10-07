import { useEffect, useRef, useState } from "react";
import type { Block } from "../api";
import { api } from "../api";
import { formatRelative } from "../format";
import { href } from "../router";
import { useAsync } from "../useAsync";

const REFRESH_MS = 30_000;

const POOL_COLORS: Record<string, string> = {
  "mining-dutch": "#38bdf8",
  saturnsally: "#2bffc6",
  "yiimp qqnpjljc": "#67e8f9",
  "forge pool": "#a78bfa",
  "forge solo": "#c4b5fd",
  "freshmeta forge": "#818cf8",
  "solopool.org": "#fbbf24",
  "solopool.site": "#f59e0b",
  "solopool.eu": "#fcd34d",
  solofury: "#fb7185",
  "zpool.ca": "#86efac",
  "letsmine.it": "#34d399",
  "1miner.net": "#22d3ee",
  bcmonster: "#f472b6",
  blockforge: "#c084fc",
  "rt-pool.cc": "#60a5fa",
  "bitsolo.me": "#fda4af",
  unknown: "#7d8ba6",
};

const FALLBACK = ["#2bffc6", "#38bdf8", "#a78bfa", "#fbbf24", "#fb7185", "#67e8f9"];

function poolColor(name: string | undefined): string {
  const key = (name ?? "unknown").toLowerCase();
  if (POOL_COLORS[key]) return POOL_COLORS[key];
  let hash = 0;
  for (const ch of key) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK[hash % FALLBACK.length];
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

/** Crystal size: hollow coinbase-only blocks stay small; busier blocks grow. */
function crystalRadius(txCount: number): number {
  if (txCount <= 1) return 8;
  return Math.min(15, 9.5 + Math.log2(txCount) * 1.6);
}

export function ChainVein() {
  const blocks = useAsync((signal) => api.recentBlocks(signal), [], REFRESH_MS);
  const newest = blocks.data?.[0]?.height;
  const seen = useRef<number | undefined>(undefined);
  const [forged, setForged] = useState<number>();

  useEffect(() => {
    if (newest === undefined) return;
    if (seen.current !== undefined && newest > seen.current) setForged(newest);
    seen.current = newest;
  }, [newest]);

  const chain = blocks.data ? [...blocks.data].reverse() : [];

  return (
    <div className="vein" aria-label="Recently mined blocks">
      <div className="vein-mark">
        <span className="vein-kicker">The Quarry</span>
        <span className="vein-hint">each crystal is a mined block</span>
      </div>
      <div className="vein-track">
        {chain.length === 0 &&
          Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="vein-slot">
              {i > 0 && <span className="filament dim" />}
              <span className="gem ghost" />
            </span>
          ))}
        {chain.map((block, i) => (
          <VeinCrystal
            key={block.id}
            block={block}
            linked={i > 0}
            fresh={block.height === forged}
          />
        ))}
        <span className="vein-tip" aria-hidden>
          <span className="vein-spark" />
        </span>
      </div>
      <div className="vein-legend">
        <span>
          <i className="swatch solid" /> has txs
        </span>
        <span>
          <i className="swatch hollow" /> empty
        </span>
        <span className="muted">color = miner</span>
      </div>
    </div>
  );
}

function VeinCrystal({
  block,
  linked,
  fresh,
}: {
  block: Block;
  linked: boolean;
  fresh: boolean;
}) {
  const pool = block.extras?.pool?.name ?? "Unknown";
  const color = poolColor(pool);
  const empty = block.tx_count <= 1;
  const r = crystalRadius(block.tx_count);
  const label = `#${block.height.toLocaleString("en-US")} · ${pool} · ${block.tx_count} tx${block.tx_count === 1 ? "" : "s"} · ${formatRelative(block.timestamp)}`;

  return (
    <span className="vein-slot">
      {linked && <span className="filament" style={{ color }} />}
      <a
        className={fresh ? "gem fresh" : "gem"}
        href={href.block(block.id)}
        style={{ color, width: r * 2 + 6, height: r * 2 + 8 }}
        aria-label={label}
      >
        <svg viewBox="0 0 40 44" aria-hidden>
          <polygon
            points={hexPoints(20, 22, 16)}
            fill={empty ? "transparent" : "currentColor"}
            fillOpacity={empty ? 0 : Math.min(0.9, 0.28 + Math.log2(block.tx_count) * 0.16)}
            stroke="currentColor"
            strokeWidth={empty ? 1.4 : 1}
          />
          {!empty && <polygon points={hexPoints(20, 22, 6)} fill="#041018" fillOpacity="0.55" />}
        </svg>
        <span className="gem-card">
          <strong>#{block.height.toLocaleString("en-US")}</strong>
          <span>{pool}</span>
          <span>
            {empty ? "Empty block" : `${block.tx_count.toLocaleString("en-US")} transactions`}
          </span>
          <span className="muted">{formatRelative(block.timestamp)}</span>
        </span>
      </a>
    </span>
  );
}
