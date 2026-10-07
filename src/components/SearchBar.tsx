import { useState, type FormEvent } from "react";
import { api, NotFoundError } from "../api";
import { href, navigate } from "../router";
import { normalizeAddress } from "./AddressPage";

/** Resolves a search query to a route: txid, block hash, block height, or address. */
async function resolve(query: string): Promise<string> {
  const q = query.trim();
  if (/^\d+$/.test(q)) return href.blockHeight(Number(q));
  if (/^[0-9a-fA-F]{64}$/.test(q)) {
    const id = q.toLowerCase();
    try {
      await api.tx(id);
      return href.tx(id);
    } catch (err) {
      if (!(err instanceof NotFoundError)) throw err;
    }
    try {
      await api.block(id);
      return href.block(id);
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new Error("No transaction or block with that hash.");
      }
      throw err;
    }
  }
  const address = normalizeAddress(q);
  if (address.includes(":") || /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) {
    return href.address(address);
  }
  throw new Error("Enter a transaction ID, block height, block hash, or BCH2 address.");
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      navigate(await resolve(query));
      setQuery("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="search" onSubmit={onSubmit}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search transaction ID, block height / hash, or address"
        aria-label="Search"
        spellCheck={false}
        autoComplete="off"
      />
      <button type="submit" disabled={busy}>
        {busy ? "Searching…" : "Search"}
      </button>
      {error && <div className="search-error">{error}</div>}
    </form>
  );
}
