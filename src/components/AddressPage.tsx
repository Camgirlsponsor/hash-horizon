import { useEffect, useState } from "react";
import { ADDRESS_PREFIX, api, EXPLORER_BASE, type Tx } from "../api";
import { stripPrefix } from "../format";
import { CopyButton, ErrorNotice, Field, Loading } from "./common";
import { QrCode, ShareButton } from "./Share";
import { TxSummary } from "./TxPage";
import { useAsync } from "../useAsync";

export function normalizeAddress(input: string): string {
  const a = input.trim();
  if (a.includes(":")) return a.toLowerCase();
  if (/^[qp][02-9ac-hj-np-z]{41}$/i.test(a)) return `${ADDRESS_PREFIX}:${a.toLowerCase()}`;
  return a;
}

export function AddressPage({ address: raw }: { address: string }) {
  const address = normalizeAddress(raw);
  const info = useAsync((signal) => api.address(address, signal), [address]);

  if (info.status === "error") return <ErrorNotice error={info.error} what="Address" />;
  if (!info.data) return <Loading label="Loading address…" />;

  const { chain_stats: chain, mempool_stats: mempool } = info.data;

  return (
    <div className="page">
      <section className="card">
        <div className="card-head">
          <h1>Address</h1>
          <div className="head-actions">
            <ShareButton
              title="Share address"
              qrValue={address}
              qrCaption="Scan with a BCH2 wallet to send to this address"
              links={[
                { label: "Address", url: address },
                { label: "explorer.bch2.org", url: `${EXPLORER_BASE}/address/${address}` },
                { label: "This viewer", url: window.location.href },
              ]}
            />
          </div>
        </div>
        <div className="address-layout">
          <div className="address-info">
            <div className="hash-row">
              <span className="mono break">{stripPrefix(address)}</span>
              <CopyButton text={address} />
            </div>
            <dl className="fields">
              <Field label="Transactions">{chain.tx_count.toLocaleString("en-US")}</Field>
              <Field label="Outputs received">
                {chain.funded_txo_count.toLocaleString("en-US")}
              </Field>
              <Field label="Outputs spent">{chain.spent_txo_count.toLocaleString("en-US")}</Field>
              {mempool.tx_count > 0 && (
                <Field label="Unconfirmed">
                  {mempool.tx_count.toLocaleString("en-US")} transactions
                </Field>
              )}
            </dl>
            <div className="links">
              <a href={`${EXPLORER_BASE}/address/${address}`} target="_blank" rel="noreferrer">
                View balance on explorer.bch2.org ↗
              </a>
            </div>
          </div>
          <QrCode value={address} size={132} />
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Transaction history</h2>
        </div>
        <AddressTxs address={address} />
      </section>
    </div>
  );
}

function AddressTxs({ address }: { address: string }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [done, setDone] = useState(false);

  const load = (afterTxid: string | undefined, signal?: AbortSignal) => {
    setLoading(true);
    setError(undefined);
    api.addressTxs(address, afterTxid, signal).then(
      (page) => {
        if (signal?.aborted) return;
        setTxs((prev) => {
          const seen = new Set(prev.map((t) => t.txid));
          return [...prev, ...page.filter((t) => !seen.has(t.txid))];
        });
        if (page.length === 0) setDone(true);
        setLoading(false);
      },
      (err: Error) => {
        if (signal?.aborted) return;
        setError(err);
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    const controller = new AbortController();
    setTxs([]);
    setDone(false);
    load(undefined, controller.signal);
    return () => controller.abort();
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastConfirmed = [...txs].reverse().find((t) => t.status.confirmed);

  return (
    <>
      {txs.length > 0 && (
        <ul className="tx-list">
          {txs.map((tx) => (
            <TxSummary key={tx.txid} tx={tx} focusAddress={address} />
          ))}
        </ul>
      )}
      {!loading && !error && txs.length === 0 && (
        <div className="notice">No transactions for this address.</div>
      )}
      {error && <ErrorNotice error={error} what="Transaction history" />}
      {loading ? (
        <Loading label="Loading transactions…" />
      ) : (
        !done &&
        lastConfirmed && (
          <div className="load-more">
            <button type="button" className="secondary" onClick={() => load(lastConfirmed.txid)}>
              Load more
            </button>
          </div>
        )
      )}
    </>
  );
}
