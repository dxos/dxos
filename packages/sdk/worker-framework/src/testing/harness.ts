//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Event, Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import * as Client from '../Client.ts';
import { displaceChannelFor } from '../internal/displace-channel.ts';
import * as Worker from '../Worker.ts';
import * as WorkerProtocol from '../WorkerProtocol.ts';

/** How a simulated tab's coordinator link behaves. */
type LinkMode =
  /** Messages flow both ways. */
  | 'up'
  /** Nothing sent reaches a peer and inbound messages queue until the link is `up` again — a blocked main thread. */
  | 'paused'
  /** Nothing flows either way and inbound messages are lost — a dead SharedWorker port. */
  | 'broken';

export type HubCoordinator = WorkerProtocol.WorkerCoordinator & {
  readonly link: LinkMode;
  setLink(mode: LinkMode): void;
  /** Emits on the coordinator's optional error channel, as a SharedWorker whose script failed would. */
  failWith(error: Error): void;
};

export type Hub = ReturnType<typeof createHub>;

type ProvidePort = WorkerProtocol.CoordinatorMessage & { type: 'provide-port' };

/**
 * In-process coordinator hub emulating the SharedWorker: broadcasts leadership/heartbeat/request
 * traffic to every connected tab and routes `provide-port` to the requesting tab. Unlike the real
 * coordinator it can be told to drop, hold, or pause traffic, modelling lost and late messages.
 */
export const createHub = () => {
  type Entry = {
    onMessage: Event<WorkerProtocol.CoordinatorMessage>;
    deliver: (message: WorkerProtocol.CoordinatorMessage) => void;
  };
  const entries = new Set<Entry>();
  const portsByClient = new Map<string, Entry>();
  const dropOnceFor = new Set<string>();
  const heldFor = new Map<string, ProvidePort[]>();
  const requestPortSeen = new Event<WorkerProtocol.CoordinatorMessage & { type: 'request-port' }>();

  const connect = (): HubCoordinator => {
    const onMessage = new Event<WorkerProtocol.CoordinatorMessage>();
    const onError = new Event<Error>();
    let link: LinkMode = 'up';
    const inbox: WorkerProtocol.CoordinatorMessage[] = [];
    const deliver = (message: WorkerProtocol.CoordinatorMessage) => {
      switch (link) {
        case 'up':
          onMessage.emit(message);
          break;
        case 'paused':
          inbox.push(message);
          break;
        case 'broken':
          break;
      }
    };
    const entry: Entry = { onMessage, deliver };
    entries.add(entry);
    return {
      onMessage,
      onError,
      get link() {
        return link;
      },
      setLink: (mode) => {
        link = mode;
        if (mode === 'up') {
          for (const message of inbox.splice(0)) {
            onMessage.emit(message);
          }
        } else if (mode === 'broken') {
          inbox.length = 0;
        }
      },
      failWith: (error) => onError.emit(error),
      sendMessage: (message: WorkerProtocol.CoordinatorMessage) => {
        if (link !== 'up') {
          return;
        }
        if (message.type === 'request-port') {
          portsByClient.set(message.clientId, entry);
          requestPortSeen.emit(message);
          if (dropOnceFor.has(message.clientId)) {
            dropOnceFor.delete(message.clientId);
            return; // Simulate the leader never receiving this request.
          }
        }
        if (message.type === 'provide-port') {
          const held = heldFor.get(message.clientId);
          if (held) {
            held.push(message);
            return;
          }
          const target = portsByClient.get(message.clientId);
          setTimeout(() => target?.deliver(message));
          return;
        }
        for (const peer of entries) {
          setTimeout(() => peer.deliver(message));
        }
      },
    };
  };

  return {
    connect,
    /** Every `request-port` any tab sends, as the coordinator sees it. */
    requestPortSeen,
    /** Drop the next `request-port` from the given client, forcing recovery via heartbeat re-request. */
    dropNextRequestPort: (clientId: string) => dropOnceFor.add(clientId),
    /** Hold every `provide-port` for the client until {@link releaseProvidePorts}. */
    holdProvidePorts: (clientId: string) => heldFor.set(clientId, []),
    /** How many `provide-port` replies are being held for the client. */
    heldProvidePorts: (clientId: string): number => heldFor.get(clientId)?.length ?? 0,
    /** Deliver the held `provide-port` replies in order and stop holding. */
    releaseProvidePorts: (clientId: string): ProvidePort[] => {
      const held = heldFor.get(clientId) ?? [];
      heldFor.delete(clientId);
      const target = portsByClient.get(clientId);
      for (const message of held) {
        setTimeout(() => target?.deliver(message));
      }
      return held;
    },
  };
};

/**
 * A coordinator link that is broken in both directions: nothing this tab sends reaches a peer, and
 * no heartbeat, `new-leader`, or `provide-port` ever reaches this tab. Models the observed wedged
 * tab whose SharedWorker link died — it can still take Web Locks, so it can still evict a leader.
 */
export const createBrokenCoordinator = (): WorkerProtocol.WorkerCoordinator => ({
  onMessage: new Event<WorkerProtocol.CoordinatorMessage>(),
  sendMessage: () => {},
});

/** Control surface over one in-process worker instance. */
export type WorkerHandle = {
  /** Stops the worker processing or sending messages while keeping its locks — a CPU-hung worker. */
  pause(): void;
  /** Delivers everything queued while paused, in order. */
  resume(): void;
  readonly paused: boolean;
  /**
   * Wedges the worker for good: nothing is delivered into it again, its displacement channel
   * included. A paused worker still services the `BroadcastChannel` the displacement handshake runs
   * on — a blocked event loop does not, which is the state forced termination exists for.
   */
  wedge(): void;
  readonly wedged: boolean;
  /** True once the worker's endpoint closed (shutdown) or the leader terminated it. */
  readonly closed: boolean;
  /** The id the worker advertised in `ready`, which its tab matches an escalation's issuer against. */
  readonly workerId: string | undefined;
};

type WorkerFactoryOptions = {
  /** The worker starts only once this settles, like one stalled loading its script. */
  started?: Promise<void>;
  onClose?: () => void;
  onCreate?: (handle: WorkerHandle) => void;
  createRuntime?: Worker.Options['createRuntime'];
  /** Grace before a worker queued on the storage lock escalates to the incumbent's tab. */
  displaceGraceTimeout?: number;
  /**
   * Whether the handle carries `terminate()`, as a real `Worker` does. A bare `MessagePort` handle is
   * a supported production configuration and cannot stop the worker, so tests can opt out.
   */
  terminable?: boolean;
};

/**
 * Minimal MessagePort-backed dedicated worker running the real {@link Worker.run} loop, with a no-op
 * runtime unless one is given — exercises leader election and port exchange without a service runtime.
 */
export const createWorkerFactory =
  (
    storageLockKey: string,
    {
      started = Promise.resolve(),
      onClose,
      onCreate,
      createRuntime = () => Effect.succeed({ createSession: () => Effect.never }),
      displaceGraceTimeout,
      terminable = true,
    }: WorkerFactoryOptions = {},
  ) =>
  () => {
    const channel = new MessageChannel();
    channel.port1.start();
    // A worker closed before it starts never runs, as a terminated one would not.
    let closed = false;
    const markClosed = () => {
      if (!closed) {
        closed = true;
        onClose?.();
      }
    };
    // Closing the leader's end stands in for `Worker.terminate()`.
    const terminated = new AbortController();
    // Recorded from both ends' `close` calls: browsers do not reliably fire a port's `close` event.
    const closeClientEnd = channel.port2.close.bind(channel.port2);
    channel.port2.close = () => {
      closeClientEnd();
      terminated.abort();
      markClosed();
    };

    let paused = false;
    let wedged = false;
    let workerId: string | undefined;
    const outbox: Array<() => void> = [];
    const inbox: Array<() => void> = [];
    const listeners = new Map<(ev: MessageEvent<WorkerProtocol.DedicatedWorkerMessage>) => void, EventListener>();
    // The channel `Worker.run` builds for displacement, captured below; wedging silences it.
    const displaceChannels: BroadcastChannel[] = [];
    const handle: WorkerHandle = {
      pause: () => {
        paused = true;
      },
      resume: () => {
        paused = false;
        for (const deliver of inbox.splice(0)) {
          deliver();
        }
        for (const send of outbox.splice(0)) {
          send();
        }
      },
      get paused() {
        return paused;
      },
      wedge: () => {
        wedged = true;
        for (const displaceChannel of displaceChannels) {
          displaceChannel.onmessage = null;
        }
      },
      get wedged() {
        return wedged;
      },
      get closed() {
        return closed;
      },
      get workerId() {
        return workerId;
      },
    };
    onCreate?.(handle);

    void started.then(() => {
      if (closed) {
        return;
      }
      // `Worker.run` builds its displacement channel synchronously, so this window captures that one
      // channel — there is no handle on it otherwise. Matched by name so a channel some other code
      // opens inside the window is not silenced by `wedge()`.
      const displaceChannelName = displaceChannelFor(storageLockKey);
      const OriginalBroadcastChannel = globalThis.BroadcastChannel;
      globalThis.BroadcastChannel = class extends OriginalBroadcastChannel {
        constructor(name: string) {
          super(name);
          if (name === displaceChannelName) {
            displaceChannels.push(this);
          }
        }
      };
      try {
        Worker.run({
          endpoint: {
            postMessage: (message, transfer) => {
              if (message.type === 'ready') {
                workerId = message.workerId;
              }
              const send = () => channel.port1.postMessage(message, transfer ? { transfer } : undefined);
              if (paused) {
                outbox.push(send);
              } else {
                send();
              }
            },
            addEventListener: (type, listener) => {
              const wrapped: EventListener = (event) => {
                if (!(event instanceof MessageEvent) || wedged) {
                  return;
                }
                const deliver = () => listener(event);
                if (paused) {
                  inbox.push(deliver);
                } else {
                  deliver();
                }
              };
              listeners.set(listener, wrapped);
              channel.port1.addEventListener(type, wrapped);
            },
            removeEventListener: (type, listener) => {
              const wrapped = listeners.get(listener);
              if (wrapped) {
                listeners.delete(listener);
                channel.port1.removeEventListener(type, wrapped);
              }
            },
            close: () => {
              channel.port1.close();
              markClosed();
            },
          },
          storageLockKey,
          displaceGraceTimeout,
          signal: terminated.signal,
          createRuntime,
        });
      } finally {
        globalThis.BroadcastChannel = OriginalBroadcastChannel;
      }
      // A capture that misses turns `wedge()` into a no-op, and every test built on it into one that
      // exercises the cooperative path while claiming to exercise the forced one.
      invariant(displaceChannels.length === 1, 'the worker must open exactly one displacement channel synchronously');
    });
    // Stands in for `Worker.terminate()`: closing the leader's end aborts the worker's signal, which
    // stands it down and releases its Web Locks without needing it to service its event loop.
    return terminable ? Object.assign(channel.port2, { terminate: () => channel.port2.close() }) : channel.port2;
  };

/**
 * Stands in for the tab's rpc runner by posting the ready frame effect's worker protocol sends on
 * start-up (`@effect/platform-browser`'s `BrowserWorkerRunner`, a bare `[0]`).
 *
 * The worker's client transport over the reverse port awaits that frame uninterruptibly, so without
 * it a session scope cannot close (DESIGN.md D18). Read it as protocol, not as a magic number: if
 * effect changes the frame, sessions stop closing and nothing points back here.
 */
export const postRunnerReady = (port: MessagePort): void => {
  port.start();
  port.postMessage([0]);
};

/** Hands the tab the pair of ports a real worker returns for `start-session`, so its connect completes. */
export const postStubSession = (workerEnd: MessagePort, clientId: string): void => {
  const clientToWorker = new MessageChannel();
  const workerToClient = new MessageChannel();
  workerEnd.postMessage(
    {
      type: 'session',
      clientId,
      clientToWorker: clientToWorker.port2,
      workerToClient: workerToClient.port2,
      isOwner: true,
    } satisfies WorkerProtocol.DedicatedWorkerMessage,
    [clientToWorker.port2, workerToClient.port2],
  );
};

export const uniqueKeys = () => {
  const id = crypto.randomUUID();
  return { leaderLockKey: `test-leader-${id}`, storageLockKey: `test-storage-${id}` };
};

/** Reads the diagnostics the connection merges into a failure. */
export const diagnosticsOf = (error: unknown): Record<string, unknown> =>
  error instanceof Error && 'context' in error && typeof error.context === 'object' && error.context
    ? { ...error.context }
    : {};

export type Connected = {
  clientToWorker: MessagePort;
  workerToClient: MessagePort;
  isOwner: boolean;
  livenessLockKey: string;
  leaderId: string;
};

const FAST_TIMEOUTS: Client.LeaderTimeouts = { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 3_000 };

export const makeConnection = (
  hub: Hub,
  keys: { leaderLockKey: string; storageLockKey: string },
  leaderTimeouts: Client.LeaderTimeouts = FAST_TIMEOUTS,
  options: {
    maxLeaderFailures?: number;
    createWorker?: () => WorkerProtocol.WorkerOrPort;
    createCoordinator?: () => WorkerProtocol.WorkerCoordinator;
  } = {},
) => {
  const connectedTrigger = new Trigger<Connected>();
  const failures: unknown[] = [];
  const connection = new Client.Connection({
    createWorker: options.createWorker ?? createWorkerFactory(keys.storageLockKey),
    createCoordinator: options.createCoordinator ?? (() => hub.connect()),
    leaderLockKey: keys.leaderLockKey,
    leaderTimeouts,
    maxLeaderFailures: options.maxLeaderFailures,
    onPersistentFailure: (error) => failures.push(error),
    onConnect: async ({ clientToWorker, workerToClient, isOwner, livenessLockKey, leaderId }) => {
      postRunnerReady(workerToClient);
      connectedTrigger.wake({ clientToWorker, workerToClient, isOwner, livenessLockKey, leaderId });
      return { close: async () => {} };
    },
  });
  return { connection, connected: connectedTrigger.wait(), failures };
};

/**
 * A worker whose runtime records the lifetime of every scope the framework hands it: the runtime
 * scope and one scope per session.
 */
export const createRecordingWorker = (
  storageLockKey: string,
  options: Pick<WorkerFactoryOptions, 'onCreate' | 'onClose'> = {},
) => {
  const sessionsOpened: string[] = [];
  const sessionsClosed: string[] = [];
  const sessionOpenedEvent = new Event<string>();
  const sessionClosedEvent = new Event<string>();
  const runtimeClosed = new Trigger();
  let shutdown: (() => void) | undefined;
  // Sessions whose `createSession` must fail before one succeeds — a runtime that cannot serve a tab.
  let sessionFailures = 0;

  const createWorker = createWorkerFactory(storageLockKey, {
    ...options,
    createRuntime: ({ requestShutdown }) =>
      Effect.gen(function* () {
        shutdown = requestShutdown;
        yield* Effect.addFinalizer(() => Effect.sync(() => runtimeClosed.wake()));
        return {
          // Acquires into the session scope and returns; the framework decides when it ends.
          createSession: ({ clientId }) =>
            Effect.gen(function* () {
              if (sessionFailures > 0) {
                sessionFailures--;
                return yield* Effect.die(new Error('TEST: session failed to start'));
              }
              sessionsOpened.push(clientId);
              sessionOpenedEvent.emit(clientId);
              yield* Effect.addFinalizer(() =>
                Effect.sync(() => {
                  sessionsClosed.push(clientId);
                  sessionClosedEvent.emit(clientId);
                }),
              );
            }),
        };
      }),
  });

  const waitFor = (list: string[], event: Event<string>, clientId: string) =>
    list.includes(clientId)
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          const off = event.on((seen) => {
            if (seen === clientId) {
              off();
              resolve();
            }
          });
        });

  return {
    createWorker,
    sessionsOpened,
    sessionsClosed,
    /** Client ids with a session open right now. */
    liveSessions: (): string[] => {
      const live = [...sessionsOpened];
      for (const closed of sessionsClosed) {
        const index = live.indexOf(closed);
        if (index >= 0) {
          live.splice(index, 1);
        }
      }
      return live;
    },
    // The worker posts the session ports before it builds the session, so a connected tab does not
    // imply the runtime has recorded the session yet.
    sessionOpened: (clientId: string) => waitFor(sessionsOpened, sessionOpenedEvent, clientId),
    sessionClosed: (clientId: string) => waitFor(sessionsClosed, sessionClosedEvent, clientId),
    runtimeClosed: () => runtimeClosed.wait(),
    requestShutdown: () => shutdown?.(),
    failNextSessions: (count: number) => {
      sessionFailures = count;
    },
  };
};
