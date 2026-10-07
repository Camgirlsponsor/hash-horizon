import { api, BLOCK_TX_PAGE_SIZE, type Tx } from "./api";
import { decodeOpReturn, readableStrings, scriptPushes } from "./format";

export interface ChainMessage {
  kind: "coinbase" | "op_return";
  text: string;
  txid: string;
}

const MESSAGE_TX_CAP = BLOCK_TX_PAGE_SIZE * 4;

/** Text a miner or user embedded in a transaction. */
export function messagesInTx(tx: Tx): ChainMessage[] {
  const messages: ChainMessage[] = [];

  for (const vin of tx.vin) {
    if (!vin.is_coinbase || !vin.scriptsig) continue;
    const parts = [
      ...new Set(scriptPushes(vin.scriptsig).flatMap((push) => readableStrings(push))),
    ];
    if (parts.length > 0) {
      messages.push({ kind: "coinbase", text: parts.join(" · "), txid: tx.txid });
    }
  }

  for (const vout of tx.vout) {
    if (vout.scriptpubkey_type !== "op_return" && !vout.scriptpubkey.startsWith("6a")) continue;
    const parts = decodeOpReturn(vout.scriptpubkey);
    if (parts.length > 0) {
      messages.push({ kind: "op_return", text: parts.join(" "), txid: tx.txid });
    }
  }

  return messages;
}

/** Reads messages from a block, capped so a huge block cannot fetch forever. */
export async function messagesInBlock(
  hash: string,
  txCount: number,
  signal?: AbortSignal,
): Promise<{ messages: ChainMessage[]; truncated: boolean }> {
  const capped = Math.min(Math.max(txCount, 1), MESSAGE_TX_CAP);
  const pages = Math.ceil(capped / BLOCK_TX_PAGE_SIZE);
  const batches = await Promise.all(
    Array.from({ length: pages }, (_, page) =>
      api.blockTxs(hash, page * BLOCK_TX_PAGE_SIZE, signal),
    ),
  );
  return {
    messages: batches.flat().flatMap(messagesInTx),
    truncated: txCount > MESSAGE_TX_CAP,
  };
}
