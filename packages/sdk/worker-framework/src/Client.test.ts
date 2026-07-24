//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event, Trigger, asyncTimeout, sleep } from '@dxos/async';

import * as Client from './Client';
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

const makeConnection = (
  hub: ReturnType<typeof createHub>,
  keys: { leaderLockKey: string; storageLockKey: string },
  leaderTimeouts = { heartbeatInterval: 50, staleTimeout: 1_000, portTimeout: 3_000 },
) => {
  const connectedTrigger = new Trigger<Connected>();
  const connection = new Client.Connection({
    createWorker: createWorkerFactory(keys.storageLockKey),
    createCoordinator: () => hub.connect(),
    leaderLockKey: keys.leaderLockKey,
    leaderTimeouts,
    onConnect: async ({ clientToWorker, workerToClient, isOwner }) => {
      connectedTrigger.wake({ clientToWorker, workerToClient, isOwner });
      return { close: async () => {} };
    },
  });
  return { connection, connected: connectedTrigger.wait() };
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
      },
      onConnect: async () => ({ close: async () => {} }),
    });
    void connection.open().catch(() => {});
    onTestFinished(async () => {
      await connection.close().catch(() => {});
    });

    const error = await asyncTimeout(failure.wait(), 5_000);
    expect(error).toBeInstanceOf(Error);
    // Failures keep accruing past the threshold; the escalation fires once per streak.
    await sleep(200);
    expect(calls).toBe(1);
  });
});
