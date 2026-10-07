import { api, type Block } from "../api";
import { formatRelative } from "../format";
import { messagesInBlock, type ChainMessage } from "../messages";
import { useAsync } from "../useAsync";
import { BlockLink, ErrorNotice, Loading, TxLink } from "./common";

const REFRESH_MS = 60_000;

interface BlockFeed {
  block: Block;
  messages: ChainMessage[];
  truncated: boolean;
}

export function MessagesPage() {
  const feed = useAsync(loadFeed, [], REFRESH_MS);

  return (
    <div className="page">
      <section className="card">
        <div className="card-head">
          <h1>Messages</h1>
          <span className="muted small">miner notes and OP_RETURN text from recent blocks</span>
        </div>
        <p className="hero-sub">
          Miners leave a short note in the coinbase of every block. Anyone can also write a
          message into a transaction with OP_RETURN. Both show up here.
        </p>
      </section>

      {feed.status === "error" && !feed.data && <ErrorNotice error={feed.error} what="Messages" />}
      {!feed.data && feed.status === "loading" && <Loading label="Reading recent blocks…" />}
      {feed.data && feed.data.every((item) => item.messages.length === 0) && (
        <div className="notice">No readable messages in the latest blocks.</div>
      )}
      {feed.data
        ?.filter((item) => item.messages.length > 0)
        .map((item) => (
          <MessageGroup key={item.block.id} item={item} />
        ))}
    </div>
  );
}

export function BlockMessages({ hash, txCount }: { hash: string; txCount: number }) {
  const result = useAsync(
    (signal) => messagesInBlock(hash, txCount, signal),
    [hash, txCount],
  );
  if (result.status === "error") return <ErrorNotice error={result.error} what="Block messages" />;
  if (!result.data) return <Loading label="Reading messages…" />;
  if (result.data.messages.length === 0) {
    return <div className="notice">No readable message in this block.</div>;
  }
  return (
    <>
      <MessageList messages={result.data.messages} />
      {result.data.truncated && (
        <p className="muted small">Showing messages from the first 100 transactions.</p>
      )}
    </>
  );
}

function MessageGroup({ item }: { item: BlockFeed }) {
  const { block, messages, truncated } = item;
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          <BlockLink hash={block.id} height={block.height} />
        </h2>
        <span className="muted small">
          {formatRelative(block.timestamp)}
          {block.extras?.pool ? ` · ${block.extras.pool.name}` : ""}
        </span>
      </div>
      <MessageList messages={messages} />
      {truncated && <p className="muted small">Showing messages from the first 100 transactions.</p>}
    </section>
  );
}

export function MessageList({ messages }: { messages: ChainMessage[] }) {
  return (
    <ul className="message-list">
      {messages.map((message, index) => (
        <li key={`${message.txid}-${index}`} className="message-item">
          <div className="message-meta">
            <span className={message.kind === "coinbase" ? "badge coinbase" : "badge ok"}>
              {message.kind === "coinbase" ? "Coinbase" : "OP_RETURN"}
            </span>
            <TxLink txid={message.txid} short />
          </div>
          <p className="message-text">{message.text}</p>
        </li>
      ))}
    </ul>
  );
}

async function loadFeed(signal: AbortSignal): Promise<BlockFeed[]> {
  const blocks = await api.recentBlocks(signal);
  return Promise.all(
    blocks.map(async (block) => {
      const { messages, truncated } = await messagesInBlock(block.id, block.tx_count, signal);
      return { block, messages, truncated };
    }),
  );
}
