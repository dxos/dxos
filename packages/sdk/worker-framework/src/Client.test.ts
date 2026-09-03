//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event, Trigger, asyncTimeout, sleep } from '@dxos/async';

import * as Client from './Client';
import { WorkerConnectionError } from './errors';
import { LOCK_OR_RPC_WAIT_TIMEOUT } from './internal/locks';
import * as Worker from './Worker';
import * as WorkerProtocol from './WorkerProtocol';

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
 * Minimal MessagePort-backed dedicated worker running the real {@link Worker.run} loop with a no-op
 * runtime — exercises leader election and port exchange without a service runtime.
 */
const createWorkerFactory = (storageLockKey: string) => () => {
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
    createRuntime: () =>
      Effect.succeed({
        createSession: () => Effect.never,
      }),
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
  leaderTimeouts = { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 3_000 },
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
      connectedTrigger.wake({ clientToWorker, workerToClient, isOwner });
      return { close: async () => {} };
    },
  });
  return { connection, connected: connectedTrigger.wait(), failures };
};

describe('Connection multi-client', () => {
  const uniqueKeys = () => {
    const id = crypto.randomUUID();
    return { leaderLockKey: `test-leader-${id}`, storageLockKey: `test-storage-${id}` };
  };

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
        // Fails only after the worker has handed out ports and claimed the clientId — the shape of a
        // handle that rejects before `WorkerService.start` registers a tab-liveness lock, so nothing
        // on the tab side will ever close the session the worker is holding.
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

    // ~20 port timeouts' worth of runway, so an unbounded steal loop has room to show itself.
    await sleep(4_000);

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
