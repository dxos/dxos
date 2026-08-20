//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event, Trigger, asyncTimeout, sleep } from '@dxos/async';

import * as Client from './Client';
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

type Connected = { clientToWorker: MessagePort; workerToClient: MessagePort; isOwner: boolean };

/** Polls until `predicate` holds; the events under test are driven by locks and timers, not promises. */
const waitFor = async (predicate: () => boolean, timeout: number): Promise<void> => {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error('timed out waiting for condition');
    }
    await sleep(50);
  }
};

const makeConnection = (
  hub: ReturnType<typeof createHub>,
  keys: { leaderLockKey: string; storageLockKey: string },
  leaderTimeouts = { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 3_000 },
  options: { maxLeaderFailures?: number } = {},
) => {
  const connectedTrigger = new Trigger<Connected>();
  // Every connect (initial and post-failover) is recorded; `connected` still resolves on the first.
  const connects: Connected[] = [];
  const failures: unknown[] = [];
  const connection = new Client.Connection({
    createWorker: createWorkerFactory(keys.storageLockKey),
    createCoordinator: () => hub.connect(),
    leaderLockKey: keys.leaderLockKey,
    leaderTimeouts,
    maxLeaderFailures: options.maxLeaderFailures,
    onPersistentFailure: (error) => failures.push(error),
    onConnect: async ({ clientToWorker, workerToClient, isOwner }) => {
      connects.push({ clientToWorker, workerToClient, isOwner });
      connectedTrigger.wake({ clientToWorker, workerToClient, isOwner });
      return { close: async () => {} };
    },
  });
  return { connection, connected: connectedTrigger.wait(), connects, failures };
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
