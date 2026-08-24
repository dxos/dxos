//
// Copyright 2026 DXOS.org
//

import { CounterConnection, type CounterSessionInfo } from '../../stories/counter-connection';

/**
 * Snapshot of one tab's view of the shared worker. Every field is structured-clonable so the
 * Playwright driver can read it straight out of `page.evaluate`.
 */
export type StressStatus = {
  /** True once the connection has opened and an RPC client exists. */
  connected: boolean;
  clientId: string | undefined;
  /** Worker INSTANCE identity — equal across tabs iff they share one worker. */
  workerId: string | undefined;
  leaderId: string | undefined;
  isOwner: boolean;
  /** Last counter value pushed by the worker's `subscribe` stream. */
  count: number | undefined;
  /** Times this tab failed over to a freshly elected leader. */
  reconnectCount: number;
  /** Errors this tab observed, for post-mortem reporting on a failed run. */
  errors: string[];
};

/**
 * Imperative surface the stress driver calls from Node over CDP. Kept free of Promises that outlive
 * a command (`hangWorker`/`blockMainThread` are fire-and-forget) so a hung worker cannot also hang
 * the driver.
 */
export type StressHarness = {
  status: () => StressStatus;
  increment: () => Promise<number>;
  /** Round-trip time in ms; rejects if the worker is unreachable. */
  ping: () => Promise<number>;
  /** Spins the WORKER event loop for `durationMs`. Returns immediately. */
  hangWorker: (durationMs: number) => void;
  /** Spins this TAB's main thread for `durationMs`, starving the leader heartbeat. Returns immediately. */
  blockMainThread: (durationMs: number) => void;
};

declare global {
  interface Window {
    __workerStress?: StressHarness;
  }
}

const asMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Installs {@link StressHarness} on `window` for the lifetime of one page load. Returns a disposer
 * so the mounting story tears the connection down on unmount.
 */
export const installStressHarness = (): (() => Promise<void>) => {
  const connection = new CounterConnection();
  const state = {
    connected: false,
    session: undefined as CounterSessionInfo | undefined,
    count: undefined as number | undefined,
    reconnectCount: 0,
    errors: [] as string[],
  };

  const recordError = (err: unknown) => {
    state.errors.push(asMessage(err));
  };

  const unsubscribeSession = connection.sessionChanged.on((session) => {
    state.session = session;
  });

  let unsubscribeCounter: (() => Promise<void>) | undefined;
  const resubscribe = async () => {
    await unsubscribeCounter?.();
    unsubscribeCounter = connection.subscribe((value) => {
      state.count = value;
    });
  };

  const unsubscribeReconnect = connection.reconnected.on(async () => {
    state.reconnectCount += 1;
    // The old session's stream died with its worker, so the tab is only genuinely recovered once a
    // subscription exists on the new one.
    await resubscribe().catch(recordError);
  });

  const opened = connection
    .open()
    .then(async () => {
      await resubscribe();
      state.connected = true;
    })
    .catch(recordError);

  window.__workerStress = {
    status: () => ({
      connected: state.connected,
      clientId: state.session?.clientId,
      workerId: state.session?.workerId,
      leaderId: state.session?.leaderId,
      isOwner: state.session?.isOwner ?? false,
      count: state.count,
      reconnectCount: state.reconnectCount,
      errors: [...state.errors],
    }),
    increment: () => connection.increment(),
    ping: async () => (await connection.ping()).rttMs,
    hangWorker: (durationMs) => {
      void connection.blockCpu(durationMs).catch(recordError);
    },
    blockMainThread: (durationMs) => {
      // Deferred to a macrotask so the driver's `evaluate` round-trip completes before the thread
      // stops answering — otherwise the command itself times out instead of the tab going dark.
      setTimeout(() => {
        const end = Date.now() + durationMs;
        while (Date.now() < end) {
          // Busy spin — starves this tab's leader heartbeat so peers judge it stale.
        }
      }, 0);
    },
  };

  return async () => {
    delete window.__workerStress;
    unsubscribeSession();
    unsubscribeReconnect();
    await opened;
    await unsubscribeCounter?.();
    await connection.close();
  };
};
