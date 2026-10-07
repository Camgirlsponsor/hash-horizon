import { useEffect, useState } from "react";

export type Route =
  | { page: "home" }
  | { page: "network" }
  | { page: "messages" }
  | { page: "solo" }
  | { page: "tx"; txid: string }
  | { page: "block"; hash: string }
  | { page: "block-height"; height: number }
  | { page: "address"; address: string }
  | { page: "not-found"; path: string };

export function parseHash(hash: string): Route {
  const path = decodeURIComponent(hash.replace(/^#\/?/, ""));
  const [kind, ...rest] = path.split("/");
  const arg = rest.join("/");
  switch (kind) {
    case "":
      return { page: "home" };
    case "network":
      return { page: "network" };
    case "messages":
      return { page: "messages" };
    case "solo":
      return { page: "solo" };
    case "tx":
      if (arg) return { page: "tx", txid: arg.toLowerCase() };
      break;
    case "block":
      if (arg) return { page: "block", hash: arg.toLowerCase() };
      break;
    case "block-height":
      if (/^\d+$/.test(arg)) return { page: "block-height", height: Number(arg) };
      break;
    case "address":
      if (arg) return { page: "address", address: arg };
      break;
  }
  return { page: "not-found", path };
}

export const href = {
  home: () => "#/",
  network: () => "#/network",
  messages: () => "#/messages",
  solo: () => "#/solo",
  tx: (txid: string) => `#/tx/${txid}`,
  block: (hash: string) => `#/block/${hash}`,
  blockHeight: (height: number) => `#/block-height/${height}`,
  address: (address: string) => `#/address/${encodeURIComponent(address)}`,
};

export function navigate(to: string) {
  window.location.hash = to;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
