import { useState, type ReactNode } from "react";
import { NotFoundError } from "../api";
import { formatCoins, shortHash, stripPrefix } from "../format";
import { href } from "../router";

export function Amount({ sats, signed = false }: { sats: number; signed?: boolean }) {
  const cls = signed ? (sats > 0 ? "amount pos" : sats < 0 ? "amount neg" : "amount") : "amount";
  return (
    <span className={cls} title={`${sats.toLocaleString("en-US")} sat`}>
      {signed && sats > 0 ? "+" : ""}
      {formatCoins(sats)} <span className="unit">BCH2</span>
    </span>
  );
}

export function TxLink({ txid, short = false }: { txid: string; short?: boolean }) {
  return (
    <a className="mono hash" href={href.tx(txid)} title={txid}>
      {short ? shortHash(txid) : txid}
    </a>
  );
}

export function BlockLink({ hash, height }: { hash?: string; height: number }) {
  return (
    <a href={hash ? href.block(hash) : href.blockHeight(height)}>
      #{height.toLocaleString("en-US")}
    </a>
  );
}

export function AddressLink({ address, short = false }: { address: string; short?: boolean }) {
  const display = stripPrefix(address);
  return (
    <a className="mono hash" href={href.address(address)} title={address}>
      {short ? shortHash(display, 10) : display}
    </a>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
      title="Copy to clipboard"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="notice loading">{label}</div>;
}

export function ErrorNotice({ error, what }: { error: Error; what: string }) {
  if (error instanceof NotFoundError) {
    return <div className="notice error">{what} was not found on the BCH2 chain.</div>;
  }
  return (
    <div className="notice error">
      Could not load {what.toLowerCase()}: {error.message}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function StatusBadge({
  confirmed,
  confirmations,
}: {
  confirmed: boolean;
  confirmations?: number;
}) {
  if (!confirmed) return <span className="badge pending">Unconfirmed</span>;
  return (
    <span className="badge ok">
      {confirmations !== undefined
        ? `${confirmations.toLocaleString("en-US")} confirmation${confirmations === 1 ? "" : "s"}`
        : "Confirmed"}
    </span>
  );
}
