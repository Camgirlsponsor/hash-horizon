import { useEffect, useState } from "react";
import { api, BLOCK_TX_PAGE_SIZE, EXPLORER_BASE } from "../api";
import { formatBytes, formatCoins, formatDateTime, formatRelative } from "../format";
import { href } from "../router";
import { useAsync } from "../useAsync";
import { CopyButton, ErrorNotice, Field, Loading } from "./common";
import { ShareButton } from "./Share";
import { TxSummary } from "./TxPage";
import { BlockMessages } from "./MessagesPage";

export function BlockPage({ hash }: { hash: string }) {
  const block = useAsync((signal) => api.block(hash, signal), [hash]);
  const tip = useAsync((signal) => api.tipHeight(signal), [hash], 60_000);
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [hash]);

  if (block.status === "error") return <ErrorNotice error={block.error} what="Block" />;
  if (!block.data) return <Loading label="Loading block…" />;

  const b = block.data;
  const pageCount = Math.max(1, Math.ceil(b.tx_count / BLOCK_TX_PAGE_SIZE));
  const isTip = tip.data !== undefined && b.height >= tip.data;

  return (
    <div className="page">
      <section className="card">
        <div className="card-head">
          <h1>Block #{b.height.toLocaleString("en-US")}</h1>
          <div className="nav-buttons">
            <ShareButton
              title={`Share block #${b.height.toLocaleString("en-US")}`}
              qrValue={`${EXPLORER_BASE}/block/${b.id}`}
              qrCaption="Scan to open this block on explorer.bch2.org"
              links={[
                { label: "explorer.bch2.org", url: `${EXPLORER_BASE}/block/${b.id}` },
                { label: "This viewer", url: window.location.href },
                { label: "Block hash", url: b.id },
              ]}
            />
            <a className="button secondary" href={href.blockHeight(b.height - 1)}>
              ← Previous
            </a>
            {!isTip && (
              <a className="button secondary" href={href.blockHeight(b.height + 1)}>
                Next →
              </a>
            )}
          </div>
        </div>
        <div className="hash-row">
          <span className="mono break">{b.id}</span>
          <CopyButton text={b.id} />
        </div>
        <dl className="fields">
          <Field label="Time">
            {formatDateTime(b.timestamp)}{" "}
            <span className="muted">({formatRelative(b.timestamp)})</span>
          </Field>
          <Field label="Transactions">{b.tx_count.toLocaleString("en-US")}</Field>
          <Field label="Size">{formatBytes(b.size)}</Field>
          {tip.data !== undefined && (
            <Field label="Confirmations">{(tip.data - b.height + 1).toLocaleString("en-US")}</Field>
          )}
          {b.extras?.pool && <Field label="Miner">{b.extras.pool.name}</Field>}
          {b.extras?.reward !== undefined && (
            <Field label="Reward">{formatCoins(b.extras.reward)} BCH2</Field>
          )}
          {b.extras?.totalFees !== undefined && (
            <Field label="Total fees">{b.extras.totalFees.toLocaleString("en-US")} sat</Field>
          )}
          <Field label="Difficulty">
            {b.difficulty.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Field>
          <Field label="Merkle root">
            <span className="mono break">{b.merkle_root}</span>
          </Field>
          {b.previousblockhash && (
            <Field label="Previous block">
              <a className="mono hash break" href={href.block(b.previousblockhash)}>
                {b.previousblockhash}
              </a>
            </Field>
          )}
        </dl>
        <div className="links">
          <a href={`${EXPLORER_BASE}/block/${b.id}`} target="_blank" rel="noreferrer">
            View on explorer.bch2.org ↗
          </a>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Messages</h2>
        </div>
        <BlockMessages hash={b.id} txCount={b.tx_count} />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Transactions</h2>
          {pageCount > 1 && (
            <Pager page={page} pageCount={pageCount} onChange={setPage} />
          )}
        </div>
        <BlockTxs hash={b.id} start={page * BLOCK_TX_PAGE_SIZE} />
      </section>
    </div>
  );
}

function BlockTxs({ hash, start }: { hash: string; start: number }) {
  const txs = useAsync((signal) => api.blockTxs(hash, start, signal), [hash, start]);
  if (txs.status === "error") return <ErrorNotice error={txs.error} what="Block transactions" />;
  if (!txs.data) return <Loading label="Loading transactions…" />;
  return (
    <ul className="tx-list">
      {txs.data.map((tx) => (
        <TxSummary key={tx.txid} tx={tx} />
      ))}
    </ul>
  );
}

function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="nav-buttons">
      <button
        type="button"
        className="secondary"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        ←
      </button>
      <span className="muted">
        Page {page + 1} of {pageCount}
      </span>
      <button
        type="button"
        className="secondary"
        disabled={page >= pageCount - 1}
        onClick={() => onChange(page + 1)}
      >
        →
      </button>
    </div>
  );
}

export function BlockHeightRedirect({ height }: { height: number }) {
  const hash = useAsync((signal) => api.blockHashAtHeight(height, signal), [height]);
  useEffect(() => {
    if (hash.status === "success") window.location.replace(href.block(hash.data));
  }, [hash.status, hash.data]);
  if (hash.status === "error") {
    return (
      <div className="notice error">
        No block found at height {height.toLocaleString("en-US")}.
      </div>
    );
  }
  return <Loading label={`Finding block #${height.toLocaleString("en-US")}…`} />;
}
