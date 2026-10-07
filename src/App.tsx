import { AddressPage } from "./components/AddressPage";
import { ChainVein } from "./components/ChainVein";
import { FlowBackground } from "./components/FlowBackground";
import { BlockHeightRedirect, BlockPage } from "./components/BlockPage";
import { HomePage } from "./components/HomePage";
import { MessagesPage } from "./components/MessagesPage";
import { NetworkPage } from "./components/NetworkPage";
import { SearchBar } from "./components/SearchBar";
import { SoloPage } from "./components/SoloPage";
import { TxPage } from "./components/TxPage";
import { api, EXPLORER_BASE } from "./api";
import { href, useRoute, type Route } from "./router";
import { useAsync } from "./useAsync";

function renderRoute(route: Route) {
  switch (route.page) {
    case "home":
      return <HomePage />;
    case "network":
      return <NetworkPage />;
    case "messages":
      return <MessagesPage />;
    case "solo":
      return <SoloPage />;
    case "tx":
      return <TxPage key={route.txid} txid={route.txid} />;
    case "block":
      return <BlockPage key={route.hash} hash={route.hash} />;
    case "block-height":
      return <BlockHeightRedirect key={route.height} height={route.height} />;
    case "address":
      return <AddressPage key={route.address} address={route.address} />;
    case "not-found":
      return (
        <div className="notice error">
          Page not found. <a href={href.home()}>Go home</a>
        </div>
      );
  }
}

function LiveTip() {
  const tip = useAsync((signal) => api.tipHeight(signal), [], 30_000);
  return (
    <a className="live" href={tip.data ? href.blockHeight(tip.data) : href.home()} title="Latest block">
      <span className="live-dot" />
      LIVE
      {tip.data !== undefined && <strong>#{tip.data.toLocaleString("en-US")}</strong>}
    </a>
  );
}

export function App() {
  const route = useRoute();
  return (
    <>
      <FlowBackground />
      <header className="header">
        <div className="header-inner">
          <a className="brand" href={href.home()}>
            <span className="logo">BCH2</span>
            <span>Transaction Viewer</span>
          </a>
          <LiveTip />
          <nav className="nav">
            <a href={href.home()} className={route.page === "home" ? "active" : undefined}>
              Explorer
            </a>
            <a href={href.messages()} className={route.page === "messages" ? "active" : undefined}>
              Messages
            </a>
            <a href={href.solo()} className={route.page === "solo" ? "active" : undefined}>
              Solo
            </a>
            <a href={href.network()} className={route.page === "network" ? "active" : undefined}>
              Network
            </a>
          </nav>
          <SearchBar />
        </div>
        <ChainVein />
      </header>
      <main className="main">{renderRoute(route)}</main>
      <footer className="footer">
        Data from the{" "}
        <a href={EXPLORER_BASE} target="_blank" rel="noreferrer">
          BCH2 block explorer
        </a>{" "}
        public API.
      </footer>
    </>
  );
}
