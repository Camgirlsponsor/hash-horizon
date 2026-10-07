import { useState } from "react";
import { api, EXPLORER_BASE, type Outspend, type Tx, type Vin, type Vout } from "../api";
import {
  bytesToPrintable,
  decodeOpReturn,
  describeLocktime,
  formatBytes,
  formatDateTime,
  formatFeeRate,
  formatRelative,
  formatSats,
  hexToBytes,
} from "../format";
import { messagesInTx } from "../messages";
import { href } from "../router";
import { useAsync } from "../useAsync";
import {
  AddressLink,
  Amount,
  BlockLink,
  CopyButton,
  ErrorNotice,
  Field,
  Loading,
  StatusBadge,
  TxLink,
} from "./common";
import { ShareButton } from "./Share";
import { MessageList } from "./MessagesPage";

export function TxPage({ txid }: { txid: string }) {
  const tx = useAsync((signal) => api.tx(txid, signal), [txid]);
  const outspends = useAsync((signal) => api.outspends(txid, signal), [txid]);
  const tip = useAsync((signal) => api.tipHeight(signal), [txid], 60_000);
  const [showDetails, setShowDetails] = useState(false);

  if (!/^[0-9a-f]{64}$/.test(txid)) {
    return <div className="notice error">"{txid}" is not a valid transaction ID.</div>;
  }
  if (tx.status === "error") return <ErrorNotice error={tx.error} what="Transaction" />;
  if (!tx.data) return <Loading label="Loading transaction…" />;

  const t = tx.data;
  const isCoinbase = t.vin.some((v) => v.is_coinbase);
  const totalIn = t.vin.reduce((s, v) => s + (v.prevout?.value ?? 0), 0);
  const totalOut = t.vout.reduce((s, v) => s + v.value, 0);
  const confirmations =
    t.status.confirmed && t.status.block_height !== undefined && tip.data !== undefined
      ? tip.data - t.status.block_height + 1
      : undefined;

  const embedded = messagesInTx(t);

  return (
    <div className="page">
      {embedded.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Message</h2>
          </div>
          <MessageList messages={embedded} />
        </section>
      )}
      <section className="card">
        <div className="card-head">
          <h1>Transaction</h1>
          <StatusBadge confirmed={t.status.confirmed} confirmations={confirmations} />
          {isCoinbase && <span className="badge coinbase">Coinbase</span>}
          <div className="head-actions">
            <ShareButton
              title="Share transaction"
              qrValue={`${EXPLORER_BASE}/tx/${t.txid}`}
              qrCaption="Scan to open this transaction on explorer.bch2.org"
              links={[
                { label: "explorer.bch2.org", url: `${EXPLORER_BASE}/tx/${t.txid}` },
                { label: "This viewer", url: window.location.href },
                { label: "Transaction ID", url: t.txid },
              ]}
            />
          </div>
        </div>
        <div className="hash-row">
          <span className="mono break">{t.txid}</span>
          <CopyButton text={t.txid} />
        </div>

        <dl className="fields">
          {t.status.confirmed && t.status.block_height !== undefined ? (
            <>
              <Field label="Block">
                <BlockLink hash={t.status.block_hash} height={t.status.block_height} />
              </Field>
              {t.status.block_time && (
                <Field label="Time">
                  {formatDateTime(t.status.block_time)}{" "}
                  <span className="muted">({formatRelative(t.status.block_time)})</span>
                </Field>
              )}
            </>
          ) : (
            <Field label="Block">
              <span className="muted">Waiting in mempool</span>
            </Field>
          )}
          <Field label="Fee">
            {isCoinbase ? (
              <span className="muted">None (coinbase)</span>
            ) : (
              <>
                {formatSats(t.fee)}{" "}
                <span className="muted">({formatFeeRate(t.fee, t.size)})</span>
              </>
            )}
          </Field>
          <Field label="Size">{formatBytes(t.size)}</Field>
          <Field label="Total input">
            {isCoinbase ? <span className="muted">Newly minted</span> : <Amount sats={totalIn} />}
          </Field>
          <Field label="Total output">
            <Amount sats={totalOut} />
          </Field>
          <Field label="Version">{t.version}</Field>
          <Field label="Locktime">{describeLocktime(t.locktime)}</Field>
        </dl>

        <div className="links">
          <a href={`${EXPLORER_BASE}/tx/${t.txid}`} target="_blank" rel="noreferrer">
            View on explorer.bch2.org ↗
          </a>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>
            Inputs ({t.vin.length}) &amp; Outputs ({t.vout.length})
          </h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(e) => setShowDetails(e.target.checked)}
            />
            Show scripts
          </label>
        </div>
        <div className="flow">
          <ol className="io-list">
            {t.vin.map((vin, i) => (
              <InputRow key={i} index={i} vin={vin} showDetails={showDetails} />
            ))}
          </ol>
          <div className="flow-arrow" aria-hidden>
            ➜
          </div>
          <ol className="io-list">
            {t.vout.map((vout, i) => (
              <OutputRow
                key={i}
                index={i}
                vout={vout}
                outspend={outspends.data?.[i]}
                showDetails={showDetails}
              />
            ))}
          </ol>
        </div>
      </section>

      <RawHex txid={t.txid} />
    </div>
  );
}

function InputRow({ index, vin, showDetails }: { index: number; vin: Vin; showDetails: boolean }) {
  if (vin.is_coinbase) {
    return (
      <li className="io">
        <div className="io-main">
          <span className="io-index">#{index}</span>
          <span className="io-addr">
            <strong>Coinbase</strong> <span className="muted">(new coins)</span>
          </span>
        </div>
        <div className="io-sub mono break" title="Coinbase script as text">
          {bytesToPrintable(hexToBytes(vin.scriptsig))}
        </div>
        {showDetails && <Script label="Coinbase script (hex)" text={vin.scriptsig} />}
      </li>
    );
  }
  const prev = vin.prevout;
  return (
    <li className="io">
      <div className="io-main">
        <span className="io-index">#{index}</span>
        <span className="io-addr">
          {prev?.scriptpubkey_address ? (
            <AddressLink address={prev.scriptpubkey_address} />
          ) : (
            <span className="muted">{prev?.scriptpubkey_type ?? "unknown"}</span>
          )}
        </span>
        {prev && <Amount sats={prev.value} />}
      </div>
      <div className="io-sub">
        <span className="muted">from </span>
        <a className="mono hash" href={href.tx(vin.txid)} title={vin.txid}>
          {vin.txid.slice(0, 12)}…:{vin.vout}
        </a>
      </div>
      {showDetails && (
        <>
          <Script label="scriptSig" text={vin.scriptsig_asm || vin.scriptsig} />
          {prev && <Script label="Previous output script" text={prev.scriptpubkey_asm} />}
          <Script label="nSequence" text={`0x${vin.sequence.toString(16)}`} />
        </>
      )}
    </li>
  );
}

function OutputRow({
  index,
  vout,
  outspend,
  showDetails,
}: {
  index: number;
  vout: Vout;
  outspend?: Outspend;
  showDetails: boolean;
}) {
  const isOpReturn = vout.scriptpubkey_type === "op_return";
  return (
    <li className="io">
      <div className="io-main">
        <span className="io-index">#{index}</span>
        <span className="io-addr">
          {vout.scriptpubkey_address ? (
            <AddressLink address={vout.scriptpubkey_address} />
          ) : isOpReturn ? (
            <strong>OP_RETURN</strong>
          ) : (
            <span className="muted">{vout.scriptpubkey_type}</span>
          )}
        </span>
        <Amount sats={vout.value} />
      </div>
      {isOpReturn && (
        <div className="io-sub">
          {decodeOpReturn(vout.scriptpubkey).map((push, i) => (
            <div key={i} className="mono break opreturn">
              {push}
            </div>
          ))}
        </div>
      )}
      {!isOpReturn && (
        <div className="io-sub">
          <span className="muted">{vout.scriptpubkey_type.toUpperCase()} · </span>
          {outspend === undefined ? (
            <span className="muted">checking…</span>
          ) : outspend.spent ? (
            <>
              <span className="spent">spent</span>
              {outspend.txid && (
                <>
                  {" "}
                  <span className="muted">in </span>
                  <TxLink txid={outspend.txid} short />
                </>
              )}
            </>
          ) : (
            <span className="unspent">unspent</span>
          )}
        </div>
      )}
      {showDetails && <Script label="scriptPubKey" text={vout.scriptpubkey_asm} />}
    </li>
  );
}

function Script({ label, text }: { label: string; text: string }) {
  return (
    <div className="script">
      <div className="script-label">{label}</div>
      <code className="mono break">{text || "(empty)"}</code>
    </div>
  );
}

function RawHex({ txid }: { txid: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card">
      <div className="card-head">
        <h2>Raw transaction</h2>
        <button type="button" className="secondary" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Show hex"}
        </button>
      </div>
      {open && <RawHexBody txid={txid} />}
    </section>
  );
}

function RawHexBody({ txid }: { txid: string }) {
  const hex = useAsync((signal) => api.txHex(txid, signal), [txid]);
  if (hex.status === "error") return <ErrorNotice error={hex.error} what="Raw transaction" />;
  if (!hex.data) return <Loading />;
  return (
    <>
      <div className="hash-row">
        <span className="muted">{(hex.data.length / 2).toLocaleString("en-US")} bytes</span>
        <CopyButton text={hex.data} />
      </div>
      <pre className="mono hex">{hex.data}</pre>
    </>
  );
}

/** One-line transaction summary used in block and address listings. */
export function TxSummary({ tx, focusAddress }: { tx: Tx; focusAddress?: string }) {
  const isCoinbase = tx.vin.some((v) => v.is_coinbase);
  const totalOut = tx.vout.reduce((s, v) => s + v.value, 0);
  let net: number | undefined;
  if (focusAddress) {
    const received = tx.vout
      .filter((v) => v.scriptpubkey_address === focusAddress)
      .reduce((s, v) => s + v.value, 0);
    const sent = tx.vin
      .filter((v) => v.prevout?.scriptpubkey_address === focusAddress)
      .reduce((s, v) => s + (v.prevout?.value ?? 0), 0);
    net = received - sent;
  }
  return (
    <li className="tx-row">
      <div className="tx-row-main">
        <TxLink txid={tx.txid} />
        {isCoinbase && <span className="badge coinbase">Coinbase</span>}
        {!tx.status.confirmed && <span className="badge pending">Unconfirmed</span>}
      </div>
      <div className="tx-row-sub">
        <span className="muted">
          {isCoinbase ? "coinbase" : `${tx.vin.length} in`} → {tx.vout.length} out
          {!isCoinbase && ` · fee ${formatSats(tx.fee)}`}
          {tx.status.block_time ? ` · ${formatRelative(tx.status.block_time)}` : ""}
        </span>
        {net !== undefined ? <Amount sats={net} signed /> : <Amount sats={totalOut} />}
      </div>
    </li>
  );
}
