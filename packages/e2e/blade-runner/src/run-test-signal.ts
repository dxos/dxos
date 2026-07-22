//
// Copyright 2023 DXOS.org
//

/**
 * Minimal signal-server handle shape. The KUBE signal server package (`@dxos/signal`) was removed;
 * `runSignal` remains a stub for the blade-runner spec surface and never actually spawns a server.
 */
export type SignalServerRunner = {
  waitUntilStarted(): Promise<void>;
  url(): string;
  stop(): Promise<void>;
};

/**
 * No-op stub: the KUBE signal server was removed, so this never spawns a server and always returns
 * `undefined`. Retained so the blade-runner spec surface (`createSignalServer`) still type-checks.
 */
export const runSignal = async (
  _num: number,
  _outFolder: string,
  _signalArguments: string[],
  _onError?: (err: any) => void,
): Promise<SignalServerRunner | undefined> => {
  return undefined;
};
