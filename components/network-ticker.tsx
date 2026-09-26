"use client";

import { motion } from "motion/react";
import type { NetworkSnapshot } from "@/lib/network";
import { formatCompactNumber, formatHashrate } from "@/lib/probability";
import { formatUsd } from "@/lib/profit";

export function NetworkTicker({
  network,
  status,
}: {
  network: NetworkSnapshot | null;
  status: "loading" | "ready" | "error";
}) {
  const items =
    status === "ready" && network
      ? [
          { label: "Height", value: `#${network.blockHeight.toLocaleString("en-US")}` },
          { label: "Difficulty", value: formatCompactNumber(network.difficulty) },
          { label: "Hashrate", value: formatHashrate(network.networkHashrate) },
          { label: "Block time", value: `${Math.round(network.blockTime)}s` },
          {
            label: "Price",
            value: network.priceUsd != null ? formatUsd(network.priceUsd) : "—",
          },
          {
            label: "Reward",
            value: network.blockReward != null ? `${network.blockReward} BCH2` : "—",
          },
        ]
      : [
          { label: "Height", value: "…" },
          { label: "Difficulty", value: "…" },
          { label: "Hashrate", value: "…" },
          { label: "Block time", value: "…" },
          { label: "Price", value: "…" },
          { label: "Reward", value: "…" },
        ];

  return (
    <section className="network-ticker" aria-label="Live BCH2 network stats">
      <div className="ticker-head">
        <span className={`ticker-live ${status === "ready" ? "on" : ""}`}>
          <i />
          {status === "error" ? "Explorer offline" : status === "loading" ? "Syncing explorer" : "Live from explorer"}
        </span>
        {network && (
          <a href={network.sourceUrl} target="_blank" rel="noreferrer">
            explorer.bch2.org <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <div className="ticker-grid">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            className="ticker-cell"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
