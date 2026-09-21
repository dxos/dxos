//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event, Trigger, asyncTimeout, sleep, waitForCondition } from '@dxos/async';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';

import * as Client from './Client.ts';
import { WorkerConnectionError } from './errors.ts';
import { LOCK_OR_RPC_WAIT_TIMEOUT } from './internal/locks.ts';
import * as Worker from './Worker.ts';
import * as WorkerProtocol from './WorkerProtocol.ts';

/**
 * In-process coordinator hub emulating the SharedWorker: broadcasts leadership/heartbeat/request
 * traffic to every connected tab and routes `provide-port` to the requesting tab. Unlike the real
 * coordinator it can be told to drop a tab's first `request-port`, modelling a lost/raced message.
 */
const createHub = () => {
  type Entry = { onMessage: Event<WorkerProtocol.CoordinatorMessage> };
  const entries = new Set<Entry>();
  const portsByClient = new Map<string, Entry>();
  const dropOnceFor = new Set<string>();

  const connect = (): WorkerProtocol.WorkerCoordinator => {
    const onMessage = new Event<WorkerProtocol.CoordinatorMessage>();
    const entry: Entry = { onMessage };
    entries.add(entry);
    return {
      onMessage,
      sendMessage: (message: WorkerProtocol.CoordinatorMessage) => {
        if (message.type === 'request-port') {
          portsByClient.set(message.clientId, entry);
          if (dropOnceFor.has(message.clientId)) {
            dropOnceFor.delete(message.clientId);
            return; // Simulate the leader never receiving this request.
          }
        }
        if (message.type === 'provide-port') {
          const target = portsByClient.get(message.clientId);
          setTimeout(() => target?.onMessage.emit(message));
          return;
        }
        for (const peer of entries) {
          setTimeout(() => peer.onMessage.emit(message));
        }
      },
    };
  };

  return {
    connect,
    /** Drop the next `request-port` from the given client, forcing recovery via heartbeat re-request. */
    dropNextRequestPort: (clientId: string) => dropOnceFor.add(clientId),
  };
};

/**
 * Minimal MessagePort-backed dedicated worker running the real {@link Worker.run} loop, with a no-op
 * runtime unless one is given — exercises leader election and port exchange without a service runtime.
 */
const createWorkerFactory =
  (
    storageLockKey: string,
    {
      started = Promise.resolve(),
      onClose,
      createRuntime = () => Effect.succeed({ createSession: () => Effect.never }),
    }: { started?: Promise<void>; onClose?: () => void; createRuntime?: Worker.Options['createRuntime'] } = {},
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
    // Recorded from both ends' `close` calls: browsers do not reliably fire a port's `close` event.
    const closeClientEnd = channel.port2.close.bind(channel.port2);
    channel.port2.close = () => {
      closeClientEnd();
      markClosed();
    };
    void started.then(() => {
      if (closed) {
        return;
      }
      Worker.run({
        endpoint: {
          postMessage: (message, transfer) => channel.port1.postMessage(message, transfer ? { transfer } : undefined),
          addEventListener: (type, listener) => channel.port1.addEventListener(type, listener as EventListener),
          removeEventListener: (type, listener) => channel.port1.removeEventListener(type, listener as EventListener),
          close: () => {
            channel.port1.close();
            markClosed();
          },
        },
        storageLockKey,
        createRuntime,
      });
    });
    return channel.port2 as WorkerProtocol.WorkerOrPort;
  };

/** Reads the diagnostics the connection merges into a failure. */
const diagnosticsOf = (error: unknown): Record<string, unknown> =>
  error instanceof Error && 'context' in error && typeof error.context === 'object' && error.context
    ? { ...error.context }
    : {};

/**
 * A coordinator link that is broken in both directions: nothing this tab sends reaches a peer, and
 * no heartbeat, `new-leader`, or `provide-port` ever reaches this tab. Models the observed wedged
 * tab whose SharedWorker link died — it can still take Web Locks, so it can still evict a leader.
 */
const createBrokenCoordinator = (): WorkerProtocol.WorkerCoordinator => ({
  onMessage: new Event<WorkerProtocol.CoordinatorMessage>(),
  sendMessage: () => {},
});

type Connected = { clientToWorker: MessagePort; workerToClient: MessagePort; isOwner: boolean };

const makeConnection = (
  hub: ReturnType<typeof createHub>,
  keys: { leaderLockKey: string; storageLockKey: string },
  leaderTimeouts: Client.LeaderTimeouts = { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 3_000 },
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
    onConnect: async ({ clientToWorker, workerToClient, isOwner }) => {
      postRunnerReady(workerToClient);
      connectedTrigger.wake({ clientToWorker, workerToClient, isOwner });
      return { close: async () => {} };
    },
  });
  return { connection, connected: connectedTrigger.wait(), failures };
};

/**
 * Stands in for the tab's rpc runner by posting the ready frame effect's worker protocol sends on
 * start-up (`@effect/platform-browser`'s `BrowserWorkerRunner`, a bare `[0]`).
 *
 * The worker's client transport over the reverse port awaits that frame uninterruptibly, so without
 * it a session scope cannot close (DESIGN.md D18). Read it as protocol, not as a magic number: if
 * effect changes the frame, sessions stop closing and nothing points back here.
 */
const postRunnerReady = (port: MessagePort): void => {
  port.start();
  port.postMessage([0]);
};

const uniqueKeys = () => {
  const id = crypto.randomUUID();
  return { leaderLockKey: `test-leader-${id}`, storageLockKey: `test-storage-${id}` };
};

describe('Connection multi-client', () => {
  test('leader and a late-joining follower both connect', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const leader = makeConnection(hub, keys);
    await asyncTimeout(leader.connection.open(), 5_000);
    onTestFinished(async () => {
      await leader.connection.close();
    });
    const leaderInfo = await asyncTimeout(leader.connected, 5_000);
    expect(leaderInfo.isOwner).toBe(true);

    // Follower joins after the leader is fully established (the "second tab" timing).
    const follower = makeConnection(hub, keys);
    await asyncTimeout(follower.connection.open(), 5_000);
    onTestFinished(async () => {
      await follower.connection.close();
    });
    const followerInfo = await asyncTimeout(follower.connected, 5_000);
    expect(followerInfo.isOwner).toBe(false);
  });

  test('follower recovers via heartbeat when its initial request-port is dropped', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const leader = makeConnection(hub, keys);
    await asyncTimeout(leader.connection.open(), 5_000);
    onTestFinished(async () => {
      await leader.connection.close();
    });
    await asyncTimeout(leader.connected, 5_000);

    // Give the follower a long port timeout so the timeout-driven reschedule and lock-steal paths
    // cannot mask the fix: with the initial request-port dropped, the *only* way to connect within
    // the test window is the heartbeat-driven re-request. Without it the follower would stall for the
    // full 30s timeout (the reported "second tab never starts").
    const follower = makeConnection(hub, keys, { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 30_000 });
    hub.dropNextRequestPort(follower.connection.clientId);
    await asyncTimeout(follower.connection.open(), 5_000);
    onTestFinished(async () => {
      await follower.connection.close();
    });
    const followerInfo = await asyncTimeout(follower.connected, 5_000);
    expect(followerInfo.isOwner).toBe(false);
  });

  test('onPersistentFailure fires once after consecutive leader-session failures', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const failure = new Trigger<unknown>();
    let calls = 0;
    const connection = new Client.Connection({
      createWorker: () => {
        throw new Error('TEST: worker creation failed');
      },
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 3_000, retryBackoff: 10 },
      maxLeaderFailures: 2,
      onPersistentFailure: (error) => {
        calls++;
        failure.wake(error);
        // A throwing callback must not break the retry loop (exercises the escalation guard).
        throw new Error('TEST: callback failure');
      },
      onConnect: async () => ({ close: async () => {} }),
    });
    // open() can never complete (no leader session ever opens); it settles via the connection's
    // internal lock/RPC timeout, whose timing differs per environment (node keeps it pending past
    // close()), so teardown must not await it. The rejection handler keeps the expected failure
    // from surfacing as unhandled; an unexpected resolution throws, which vitest reports.
    void connection.open().then(
      () => {
        throw new Error('open() must not resolve: no leader session can ever open in this test.');
      },
      () => {},
    );
    onTestFinished(async () => {
      await connection.close();
    });

    const error = await asyncTimeout(failure.wait(), 5_000);
    expect(error).toBeInstanceOf(Error);
    // The connection survived the throwing callback and kept electing (close() below still works).
    // Failures keep accruing past the threshold; the escalation fires once per streak.
    await sleep(200);
    expect(calls).toBe(1);
  });

  test(
    'a follower waiting on the leader lock is never reported as a failure',
    async () => {
      const hub = createHub();
      const keys = uniqueKeys();

      const leader = makeConnection(hub, keys);
      await asyncTimeout(leader.connection.open(), 5_000);
      onTestFinished(async () => {
        await leader.connection.close();
      });
      const leaderInfo = await asyncTimeout(leader.connected, 5_000);
      expect(leaderInfo.isOwner).toBe(true);

      // `maxLeaderFailures: 1` escalates on the very first failure, so any misreading of "another tab
      // holds the lock" as a leader-session failure is caught immediately.
      const follower = makeConnection(hub, keys, undefined, { maxLeaderFailures: 1 });
      await asyncTimeout(follower.connection.open(), 5_000);
      onTestFinished(async () => {
        await follower.connection.close();
      });
      const followerInfo = await asyncTimeout(follower.connected, 5_000);
      expect(followerInfo.isOwner).toBe(false);

      // Outlive the lock/RPC budget. A bounded wait on the leader lock expires here, and the election
      // loop reports the expiry as a failed leader session: the tab escalates to `onPersistentFailure`
      // (a coordinated reload in dev) even though it is connected and healthy.
      await sleep(LOCK_OR_RPC_WAIT_TIMEOUT + 1_000);
      expect(follower.failures).toEqual([]);

      // And the more damaging half: a timed-out request leaves the lock's wait queue, so while the
      // follower backs off there is nobody positioned to take over when the leader goes away.
      const { pending } = await navigator.locks.query();
      expect((pending ?? []).map(({ name }) => name)).toContain(keys.leaderLockKey);
    },
    LOCK_OR_RPC_WAIT_TIMEOUT + 30_000,
  );

  test('reconnects after a connect attempt fails past the port exchange', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    let attempts = 0;
    const connected = new Trigger<void>();
    const connection = new Client.Connection({
      createWorker: createWorkerFactory(keys.storageLockKey),
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 3_000 },
      onConnect: async () => {
        // Fails only after the worker has handed out ports and claimed the clientId, so the worker is
        // holding a session for an attempt this tab has given up on.
        if (++attempts === 1) {
          throw new Error('TEST: transient connect failure');
        }
        connected.wake();
        return { close: async () => {} };
      },
    });
    onTestFinished(async () => {
      await connection.close();
    });

    await asyncTimeout(connection.open(), 10_000);
    await asyncTimeout(connected.wait(), 10_000);
    expect(attempts).toBeGreaterThan(1);
  });

  test('a leader whose worker never starts rejects with the leader error, not the bare timeout', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const connection = new Client.Connection({
      createWorker: () => {
        throw new Error('TEST: worker creation failed');
      },
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 200, retryBackoff: 10 },
      onConnect: async () => ({ close: async () => {} }),
    });
    onTestFinished(async () => {
      await connection.close();
    });

    const error = await connection.open().then(
      () => {
        throw new Error('open() must not resolve: no leader session can ever open in this test.');
      },
      (err) => err,
    );

    expect(String(error)).toContain('TEST: worker creation failed');
    expect(diagnosticsOf(error).workerLeaderFailures).toBeGreaterThan(0);
  }, 30_000);

  test.each(['MigrationError', 'AbortError'])(
    'a worker runtime that fails to start with %s rejects every tab still booting, and nothing retries',
    async (name) => {
      const hub = createHub();
      const keys = uniqueKeys();

      const startError = new BaseError(name, {
        message: 'TEST: migration failed',
        cause: new Error('TEST: wasm trap'),
      });
      let workersCreated = 0;
      let workersClosed = 0;
      const createWorker = createWorkerFactory(keys.storageLockKey, {
        onClose: () => workersClosed++,
        createRuntime: () => Effect.fail(startError),
      });
      let portRequests = 0;
      const portTimeout = 200;
      const tabs = [0, 1].map(() =>
        makeConnection(
          hub,
          keys,
          { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout, retryBackoff: 10 },
          {
            createWorker: () => {
              workersCreated++;
              return createWorker();
            },
            createCoordinator: () => {
              const coordinator = hub.connect();
              return {
                onMessage: coordinator.onMessage,
                sendMessage: (message) => {
                  if (message.type === 'request-port') {
                    portRequests++;
                  }
                  coordinator.sendMessage(message);
                },
              };
            },
          },
        ),
      );
      onTestFinished(async () => {
        await Promise.all(tabs.map(({ connection }) => connection.close()));
      });

      const errors = await asyncTimeout(
        Promise.all(
          tabs.map(({ connection }) =>
            connection.open().then(
              () => {
                throw new Error('open() must not resolve: the worker runtime never starts.');
              },
              (err: unknown) => err,
            ),
          ),
        ),
        5_000,
      );

      for (const error of errors) {
        invariant(error instanceof Error);
        expect(error.name).toBe(name);
        expect(error.message).toBe('TEST: migration failed');
        invariant(error.cause instanceof Error);
        expect(error.cause.message).toBe('TEST: wasm trap');
      }
      // The follower led once the failed leader let the lock go, and its own worker failed the same way.
      expect(workersCreated).toBe(2);

      // Each worker exits and gives up its storage and liveness locks instead of serving sessions.
      await waitForCondition({ condition: () => workersClosed === 2, timeout: 2_000 });
      await waitForCondition({
        condition: async () => {
          const { held } = await navigator.locks.query();
          return !(held ?? []).some(({ name }) => name?.startsWith(keys.storageLockKey));
        },
        timeout: 2_000,
      });

      // Several port timeouts later, neither the election nor either connect task has gone round again.
      const portRequestsAtFailure = portRequests;
      await sleep(portTimeout * 3);
      expect(portRequests).toBe(portRequestsAtFailure);
      expect(workersCreated).toBe(2);
    },
  );

  test('a start failure after a failed connect attempt rejects open with the start failure', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const startError = new BaseError('StartError', { message: 'TEST: migration failed' });
    let shutdownFirstWorker: (() => void) | undefined;
    let workersCreated = 0;
    const createWorker = createWorkerFactory(keys.storageLockKey, {
      createRuntime: ({ requestShutdown }) => {
        if (workersCreated > 1) {
          return Effect.fail(startError);
        }
        shutdownFirstWorker = requestShutdown;
        return Effect.succeed({ createSession: () => Effect.never });
      },
    });
    const connection = new Client.Connection({
      createWorker: () => {
        workersCreated++;
        return createWorker();
      },
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 10_000, retryBackoff: 10 },
      // The first worker hands out a port, then dies as the tab fails to connect to it.
      onConnect: async () => {
        invariant(shutdownFirstWorker);
        shutdownFirstWorker();
        throw new Error('TEST: connect failed');
      },
    });
    onTestFinished(async () => {
      await connection.close();
    });

    const error = await asyncTimeout(
      connection.open().then(
        () => {
          throw new Error('open() must not resolve: no worker ever connects.');
        },
        (err: unknown) => err,
      ),
      5_000,
    );

    invariant(error instanceof Error);
    expect(error.message).toBe('TEST: migration failed');
    expect(workersCreated).toBe(2);
  });

  test(
    'a leader session that times out closes its worker, so the retry starts one that works',
    async () => {
      const hub = createHub();
      const keys = uniqueKeys();

      // The first worker starts only once its session has given up on it, like a worker stalled past the budget.
      const lateStart = new Trigger();
      const lateClosed = new Trigger();
      const late = createWorkerFactory(keys.storageLockKey, {
        started: lateStart.wait(),
        onClose: () => lateClosed.wake(),
      });
      const healthy = createWorkerFactory(keys.storageLockKey);
      let workersCreated = 0;
      const { connection, connected } = makeConnection(
        hub,
        keys,
        { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 10_000 },
        { createWorker: () => (++workersCreated === 1 ? late() : healthy()) },
      );
      onTestFinished(async () => {
        await connection.close();
      });
      const opened = connection.open();

      await asyncTimeout(lateClosed.wait(), LOCK_OR_RPC_WAIT_TIMEOUT + 2_000);
      lateStart.wake();

      await asyncTimeout(opened, 10_000);
      await asyncTimeout(connected, 5_000);
      expect(workersCreated).toBe(2);
    },
    LOCK_OR_RPC_WAIT_TIMEOUT + 30_000,
  );

  test('a tab that never receives a port reports the port timeouts it accrued', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const timeouts = { heartbeatInterval: 20, staleTimeout: 100, portTimeout: 200 };

    const leader = makeConnection(hub, keys, timeouts);
    await asyncTimeout(leader.connection.open(), 10_000);
    onTestFinished(async () => {
      await leader.connection.close();
    });

    const wedged = makeConnection(hub, keys, timeouts, {
      maxLeaderFailures: 2,
      createCoordinator: createBrokenCoordinator,
    });
    onTestFinished(async () => {
      await wedged.connection.close();
    });

    const error = await wedged.connection.open().then(
      () => {
        throw new Error('open() must not resolve: this coordinator never delivers a port.');
      },
      (err) => err,
    );

    // Typed, so a consumer discriminates on the class rather than matching the message.
    expect(WorkerConnectionError.is(error)).toBe(true);
    const diagnostics = diagnosticsOf(error);
    expect(diagnostics.workerPortTimeouts).toBeGreaterThan(0);
    expect(['requesting-port', 'port-timeout']).toContain(diagnostics.workerConnectPhase);
    expect(diagnostics.workerMsSinceLeaderHeartbeat).toBeUndefined();
  }, 30_000);

  test('a leader whose session opened reports itself as the leader when the connection stalls', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const connection = new Client.Connection({
      createWorker: createWorkerFactory(keys.storageLockKey),
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 200, retryBackoff: 10 },
      // Never resolving leaves the leader holding its lock with the session open, which is the
      // state `workerIsLeader` exists to name — and the one an enumerated phase list dropped.
      onConnect: () => new Promise<{ close: () => Promise<void> }>(() => {}),
    });
    onTestFinished(async () => {
      await connection.close();
    });

    const error = await connection.open().then(
      () => {
        throw new Error('open() must not resolve: onConnect never settles in this test.');
      },
      (err) => err,
    );

    const diagnostics = diagnosticsOf(error);
    expect(diagnostics.workerIsLeader).toBe(true);
    expect(diagnostics.workerLeaderPhase).toBe('session-open');
  }, 30_000);

  test('a tab with a broken coordinator link stops stealing instead of restarting the leader forever', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const timeouts = { heartbeatInterval: 20, staleTimeout: 100, portTimeout: 200 };

    let leaderWorkers = 0;
    const countingWorkerFactory = () => {
      leaderWorkers++;
      return createWorkerFactory(keys.storageLockKey)();
    };

    const leader = makeConnection(hub, keys, timeouts, { createWorker: countingWorkerFactory });
    await asyncTimeout(leader.connection.open(), 10_000);
    onTestFinished(async () => {
      await leader.connection.close();
    });
    expect((await asyncTimeout(leader.connected, 10_000)).isOwner).toBe(true);
    expect(leaderWorkers).toBe(1);

    // A steal by this tab is always wasted — it can never receive a port — but still aborts the
    // incumbent's lock, terminating its worker and forcing a full re-boot.
    const wedged = makeConnection(hub, keys, timeouts, {
      maxLeaderFailures: 2,
      createCoordinator: createBrokenCoordinator,
    });
    // Asserted in teardown rather than discarded: `open()` must reject because no port ever arrives,
    // and swallowing it here would hide any other failure the connection reports.
    const wedgedOpen = expect(wedged.connection.open()).rejects.toThrow();
    onTestFinished(async () => {
      await wedged.connection.close();
      await wedgedOpen;
    });

    // Anchor on the steal budget actually exhausting (escalation fires) rather than guessing a
    // duration long enough for an unbounded steal loop to have shown itself.
    await waitForCondition({ condition: () => wedged.failures.length > 0, timeout: 10_000 });

    // Bounded by the steal budget: at most `maxLeaderFailures` evictions, one worker re-creation each.
    expect(leaderWorkers).toBeLessThanOrEqual(1 + 2);

    // Escalated once so the app can surface a reload, rather than degrading silently forever.
    expect(wedged.failures).toHaveLength(1);
    expect(wedged.failures[0]).toBeInstanceOf(Error);

    // And election is not left stranded: someone still holds the lock, so a tab still owns a
    // worker. A steal that only evicts — without the stealer re-entering election — can end with
    // the lock free and every tab waiting on a leader that no longer exists.
    const { held } = await navigator.locks.query();
    expect((held ?? []).map(({ name }) => name)).toContain(keys.leaderLockKey);
  }, 30_000);

  test('a connection closed while its leader session opens closes that session and does not lead again', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const first = makeConnection(hub, keys);
    onTestFinished(async () => {
      await first.connection.close();
    });
    await first.connection.open();

    const workerStarted = new Trigger();
    const workerClosed = new Trigger();
    let workersCreated = 0;
    const createWorker = createWorkerFactory(uniqueKeys().storageLockKey, {
      started: workerStarted.wait(),
      onClose: () => workerClosed.wake(),
    });
    const second = makeConnection(hub, keys, undefined, {
      maxLeaderFailures: 1,
      createWorker: () => {
        workersCreated++;
        return createWorker();
      },
    });
    onTestFinished(async () => {
      await second.connection.close();
    });
    await second.connection.open();

    // The follower wins the election once the leader leaves; its worker is held back from starting.
    await first.connection.close();
    await waitForCondition({ condition: () => workersCreated === 1, timeout: 5_000 });

    const closing = second.connection.close();
    await sleep(50);
    workerStarted.wake();
    await closing;

    await asyncTimeout(workerClosed.wait(), 2_000);
    await sleep(200);
    const { held } = await navigator.locks.query();
    expect(held?.map((lock) => lock.name)).not.toContain(keys.leaderLockKey);
    expect(workersCreated).toBe(1);
    expect(second.failures).toEqual([]);
  });

  test('rejects a non-positive maxLeaderFailures', () => {
    const hub = createHub();
    const keys = uniqueKeys();
    expect(
      () =>
        new Client.Connection({
          createWorker: createWorkerFactory(keys.storageLockKey),
          createCoordinator: () => hub.connect(),
          leaderLockKey: keys.leaderLockKey,
          maxLeaderFailures: 0,
          onConnect: async () => ({ close: async () => {} }),
        }),
    ).toThrow('maxLeaderFailures must be a positive integer');
  });
});

/**
 * A worker whose runtime records the lifetime of every scope the framework hands it: the runtime
 * scope and one scope per session.
 */
const createRecordingWorker = (storageLockKey: string) => {
  const sessionsOpened: string[] = [];
  const sessionsClosed: string[] = [];
  const sessionOpenedEvent = new Event<string>();
  const sessionClosedEvent = new Event<string>();
  const runtimeClosed = new Trigger();
  let shutdown: (() => void) | undefined;

  const createWorker = () => {
    const channel = new MessageChannel();
    channel.port1.start();
    Worker.run({
      endpoint: {
        postMessage: (message, transfer) => channel.port1.postMessage(message, transfer ? { transfer } : undefined),
        addEventListener: (type, listener) => channel.port1.addEventListener(type, listener as EventListener),
        removeEventListener: (type, listener) => channel.port1.removeEventListener(type, listener as EventListener),
        close: () => channel.port1.close(),
      },
      storageLockKey,
      createRuntime: ({ requestShutdown }) =>
        Effect.gen(function* () {
          shutdown = requestShutdown;
          yield* Effect.addFinalizer(() => Effect.sync(() => runtimeClosed.wake()));
          return {
            // Acquires into the session scope and returns; the framework decides when it ends.
            createSession: ({ clientId }) =>
              Effect.gen(function* () {
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
    return channel.port2 as WorkerProtocol.WorkerOrPort;
  };

  return {
    createWorker,
    sessionsOpened,
    sessionsClosed,
    // The worker posts the session ports before it builds the session, so a connected tab does not
    // imply the runtime has recorded the session yet.
    sessionOpened: (clientId: string) =>
      sessionsOpened.includes(clientId)
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const off = sessionOpenedEvent.on((opened) => {
              if (opened === clientId) {
                off();
                resolve();
              }
            });
          }),
    sessionClosed: (clientId: string) =>
      sessionsClosed.includes(clientId)
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const off = sessionClosedEvent.on((closed) => {
              if (closed === clientId) {
                off();
                resolve();
              }
            });
          }),
    runtimeClosed: () => runtimeClosed.wait(),
    requestShutdown: () => shutdown?.(),
  };
};

describe('Worker session lifetime', () => {
  test('a session stays open while its tab is connected', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const worker = createRecordingWorker(keys.storageLockKey);
    const { connection } = makeConnection(hub, keys, undefined, { createWorker: worker.createWorker });
    onTestFinished(async () => {
      await connection.close();
    });

    await asyncTimeout(connection.open(), 10_000);
    await asyncTimeout(worker.sessionOpened(connection.clientId), 5_000);
    expect(worker.sessionsOpened).toEqual([connection.clientId]);
    await sleep(200);
    expect(worker.sessionsClosed).toEqual([]);
  });

  test('closing a tab releases its session lock, which closes its session scope', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const worker = createRecordingWorker(keys.storageLockKey);
    const { connection: leader } = makeConnection(hub, keys, undefined, { createWorker: worker.createWorker });
    onTestFinished(async () => {
      await leader.close();
    });
    await asyncTimeout(leader.open(), 10_000);

    // A follower, so closing it does not also terminate the worker.
    const { connection: follower } = makeConnection(hub, keys, undefined, { createWorker: worker.createWorker });
    await asyncTimeout(follower.open(), 10_000);
    await asyncTimeout(worker.sessionOpened(follower.clientId), 5_000);
    expect(worker.sessionsOpened).toContain(follower.clientId);

    await follower.close();
    await asyncTimeout(worker.sessionClosed(follower.clientId), 5_000);
    expect(worker.sessionsClosed).toEqual([follower.clientId]);
  });

  test('worker shutdown closes every session scope before the runtime scope', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const worker = createRecordingWorker(keys.storageLockKey);
    const { connection: leader } = makeConnection(hub, keys, undefined, { createWorker: worker.createWorker });
    onTestFinished(async () => {
      await leader.close();
    });
    await asyncTimeout(leader.open(), 10_000);
    const { connection: follower } = makeConnection(hub, keys, undefined, { createWorker: worker.createWorker });
    onTestFinished(async () => {
      await follower.close();
    });
    await asyncTimeout(follower.open(), 10_000);
    await asyncTimeout(worker.sessionOpened(leader.clientId), 5_000);
    await asyncTimeout(worker.sessionOpened(follower.clientId), 5_000);

    const order: string[] = [];
    void worker.sessionClosed(leader.clientId).then(() => order.push('session'));
    void worker.sessionClosed(follower.clientId).then(() => order.push('session'));
    void worker.runtimeClosed().then(() => order.push('runtime'));

    worker.requestShutdown();
    await asyncTimeout(worker.runtimeClosed(), 5_000);
    await sleep(0);
    expect(order).toEqual(['session', 'session', 'runtime']);
  });
});

describe('Worker displacement', () => {
  test('a worker starting while a previous one holds the storage lock displaces it', async () => {
    const { storageLockKey } = uniqueKeys();

    const incumbent = startBareWorker(storageLockKey);
    // `listening` is posted from inside the storage lock, so it is proof the incumbent holds it.
    await asyncTimeout(incumbent.listening, 5_000);

    const successor = startBareWorker(storageLockKey);
    await asyncTimeout(successor.listening, 5_000);
    await asyncTimeout(incumbent.closed, 5_000);
  }, 20_000);

  test('a leader session opens against a storage lock a previous worker still holds', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    // A worker outliving the tab that spawned it — tearing that worker down needs the old tab's main
    // thread, which is exactly what is unavailable when a leader is evicted for being wedged.
    const stranded = startBareWorker(keys.storageLockKey);
    await asyncTimeout(stranded.listening, 5_000);

    const { connection, connected } = makeConnection(hub, keys);
    onTestFinished(async () => {
      await connection.close();
    });

    // Budgeted past `LOCK_OR_RPC_WAIT_TIMEOUT` so a worker that never takes the storage lock fails
    // this with the reported "opening worker leader session" timeout rather than a bare test timeout.
    await asyncTimeout(connection.open(), 25_000);
    await asyncTimeout(connected, 5_000);
    await asyncTimeout(stranded.closed, 5_000);
  }, 40_000);
});

/**
 * Runs the real worker loop over a MessageChannel, exposing the two protocol milestones the
 * displacement handshake turns on: `listening` (this worker holds the storage lock and serves) and
 * the endpoint closing (it stood down).
 */
const startBareWorker = (storageLockKey: string) => {
  const channel = new MessageChannel();
  channel.port1.start();
  channel.port2.start();
  const listening = new Trigger();
  const closed = new Trigger();
  // The worker's end is port1, so its protocol messages surface on port2.
  channel.port2.addEventListener('message', (event) => {
    if ((event as MessageEvent<WorkerProtocol.DedicatedWorkerMessage>).data.type === 'listening') {
      listening.wake();
    }
  });
  Worker.run({
    endpoint: {
      postMessage: (message, transfer) => channel.port1.postMessage(message, transfer ? { transfer } : undefined),
      addEventListener: (type, listener) => channel.port1.addEventListener(type, listener as EventListener),
      removeEventListener: (type, listener) => channel.port1.removeEventListener(type, listener as EventListener),
      close: () => {
        channel.port1.close();
        closed.wake();
      },
    },
    storageLockKey,
    createRuntime: () => Effect.succeed({ createSession: () => Effect.never }),
  });
  return { listening: listening.wait(), closed: closed.wait() };
};
