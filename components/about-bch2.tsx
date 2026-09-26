"use client";

import { motion } from "motion/react";

const FEATURES = [
  {
    title: "SHA-256 proof of work",
    body: "Same ASIC family as Bitcoin and Bitcoin Cash. Bitaxe units and full-size miners can point at BCH2 solo.",
  },
  {
    title: "Cash rules, clean supply",
    body: "32MB blocks, CashAddr, CashTokens, Schnorr, ASERT, and DSProof. No premine, no developer fee—new coins go to miners.",
  },
  {
    title: "Predictable issuance",
    body: "Ten-minute blocks, 50 BCH2 genesis subsidy, and a 21 million cap with Bitcoin-style halvings every 210,000 blocks.",
  },
];

export function AboutBch2() {
  return (
    <section className="about-bch2" id="about" aria-labelledby="about-title">
      <div className="about-copy">
        <div className="eyebrow">
          <span>02</span> What is BCH2
        </div>
        <h2 id="about-title">Bitcoin Cash II, built for miners.</h2>
        <p>
          BCH2 forked from Bitcoin II (BC2) at block 53,200 and activated Bitcoin Cash consensus rules. It keeps a
          clean UTXO model—no SegWit, no Taproot, no RBF—while shipping modern cash features like tokens and adaptive
          block limits.
        </p>
        <div className="about-links">
          <a href="https://bch2.org/" target="_blank" rel="noreferrer">
            Official site <span aria-hidden="true">↗</span>
          </a>
          <a href="https://explorer.bch2.org" target="_blank" rel="noreferrer">
            Block explorer <span aria-hidden="true">↗</span>
          </a>
          <a href="https://bch2.org/mining.html" target="_blank" rel="noreferrer">
            Mining guide <span aria-hidden="true">↗</span>
          </a>
          <a href="https://wallet.bch2.org" target="_blank" rel="noreferrer">
            Web wallet <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <div className="about-features">
        {FEATURES.map((feature, index) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
