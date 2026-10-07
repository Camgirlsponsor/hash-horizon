import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading"; data?: T }
  | { status: "success"; data: T }
  | { status: "error"; error: Error; data?: T };

/**
 * Runs `fn` whenever `deps` change, aborting the previous request.
 * With `refreshMs`, re-runs on an interval while keeping the last data visible.
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  refreshMs?: number,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    setState({ status: "loading" });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();
    fn(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: "success", data });
      },
      (error: Error) => {
        if (!controller.signal.aborted) {
          setState((prev) => ({ status: "error", error, data: prev.data }));
        }
      },
    );
    return () => controller.abort();
  }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!refreshMs) return;
    const id = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs, reload]);

  return { ...state, reload };
}
