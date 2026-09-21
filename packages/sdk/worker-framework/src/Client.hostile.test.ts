//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, sleep, waitForCondition } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import * as Client from './Client.ts';
import { WorkerError } from './errors.ts';
import {
  type Connected,
  type HubCoordinator,
  createBrokenCoordinator,
  createHub,
  createRecordingWorker,
  createWorkerFactory,
  diagnosticsOf,
  makeConnection,
  postRunnerReady,
  uniqueKeys,
} from './testing/harness.ts';

const TIMEOUTS: Client.LeaderTimeouts = {
  heartbeatInterval: 20,
  staleTimeout: 100,
  portTimeout: 200,
  retryBackoff: 10,
};

/**
 * The framework's callers and the browser are both assumed hostile here: connection handles that
 * throw, resolve late, or close slowly; workers that die mid-handshake or answer late; coordinator
 * links that die. Each test pins one way that used to wedge or churn the connection.
 */
describe('Connection under hostile callers and browsers', () => {
  test('a handle that resolves after its attempt was abandoned is closed, not installed', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const worker = createRecordingWorker(keys.storageLockKey);

    const gate = new Trigger();
    const firstOpening = new Trigger();
    const handles: Array<{ id: number; closed: boolean }> = [];
    let reconnects = 0;
    const connection = new Client.Connection({
      createWorker: worker.createWorker,
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: TIMEOUTS,
      onConnect: async ({ workerToClient }) => {
        postRunnerReady(workerToClient);
        const id = handles.length + 1;
        const handle = { id, closed: false, close: async () => void (handle.closed = true) };
        handles.push(handle);
        // The first attempt's handle only resolves once the test lets it — long after its session died.
        if (id === 1) {
          firstOpening.wake();
          await gate.wait();
        }
        return handle;
      },
    });
    connection.reconnected.on(() => {
      reconnects++;
    });
    onTestFinished(async () => {
      gate.wake();
      await connection.close();
    });

    const opened = connection.open();
    await asyncTimeout(firstOpening.wait(), 5_000);
    // The worker dies while the first handle is still opening; the connection must recover on a second attempt.
    worker.requestShutdown();
    await asyncTimeout(opened, 10_000);
    expect(handles).toHaveLength(2);
    expect(handles[1].closed).toBe(false);

    gate.wake();
    await sleep(100);
    expect(handles[0].closed).toBe(true);
    expect(handles[1].closed).toBe(false);
    // The stale attempt completing is not a reconnection.
    expect(reconnects).toBe(0);

    await connection.close();
    expect(handles[1].closed).toBe(true);
  });

  test('a leader whose own port request times out does not steal its own lock', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    let workersCreated = 0;
    const createWorker = createWorkerFactory(keys.storageLockKey);
    // Its coordinator link is dead, so its own request-port never comes back and no heartbeat is ever seen.
    const wedged = makeConnection(hub, keys, TIMEOUTS, {
      maxLeaderFailures: 2,
      createCoordinator: createBrokenCoordinator,
      createWorker: () => {
        workersCreated++;
        return createWorker();
      },
    });
    const wedgedOpen = expect(wedged.connection.open()).rejects.toThrow();

    // Long enough for several port timeouts, each of which used to evict and restart the worker.
    await waitForCondition({ condition: () => wedged.failures.length > 0, timeout: 5_000 });
    expect(workersCreated).toBe(1);
    expect(wedged.failures).toHaveLength(1);
    const { held } = await navigator.locks.query();
    expect((held ?? []).map(({ name }) => name)).toContain(keys.leaderLockKey);
    // Rejects at the end of its budget and, having never opened, tears itself down (see below).
    await wedgedOpen;
  }, 30_000);

  test('a throwing reconnect callback neither fails the reconnection nor loops it', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const worker = createRecordingWorker(keys.storageLockKey);

    let connects = 0;
    let goodCalls = 0;
    const reconnected = new Trigger();
    const connection = new Client.Connection({
      createWorker: worker.createWorker,
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: TIMEOUTS,
      onConnect: async ({ workerToClient }) => {
        postRunnerReady(workerToClient);
        connects++;
        return { close: async () => {} };
      },
    });
    connection.onReconnect(async () => {
      throw new Error('TEST: reconnect callback failed');
    });
    connection.onReconnect(async () => {
      goodCalls++;
    });
    connection.reconnected.on(() => {
      reconnected.wake();
    });
    onTestFinished(async () => {
      await connection.close();
    });

    await asyncTimeout(connection.open(), 10_000);
    worker.requestShutdown();
    await asyncTimeout(reconnected.wait(), 10_000);

    await sleep(300);
    expect(connects).toBe(2);
    expect(goodCalls).toBe(1);
  });

  test('a connect handle that keeps failing is retried with backoff, not in a tight loop', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    let attempts = 0;
    const connection = new Client.Connection({
      createWorker: createWorkerFactory(keys.storageLockKey),
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: { ...TIMEOUTS, retryBackoff: 100 },
      onConnect: async () => {
        attempts++;
        throw new Error('TEST: connect failed');
      },
    });
    const opened = expect(connection.open()).rejects.toThrow();

    await sleep(1_000);
    // Backoff 100ms doubling: about four attempts fit in the window; a tight loop makes hundreds.
    expect(attempts).toBeGreaterThanOrEqual(2);
    expect(attempts).toBeLessThanOrEqual(6);
    await opened;
  }, 30_000);

  test('a stale provide-port for an abandoned attempt is ignored', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const leader = makeConnection(hub, keys, TIMEOUTS);
    await asyncTimeout(leader.connection.open(), 10_000);
    onTestFinished(async () => {
      await leader.connection.close();
    });

    const follower = makeConnection(hub, keys, TIMEOUTS);
    onTestFinished(async () => {
      await follower.connection.close();
    });
    // Every reply to the follower is held, so its first attempt expires and a second one starts.
    hub.holdProvidePorts(follower.connection.clientId);
    const opened = follower.connection.open();
    const secondAttempt = hub.requestPortSeen.waitFor(
      (message) => message.clientId === follower.connection.clientId && (message.attempt ?? 0) >= 2,
    );
    await asyncTimeout(secondAttempt, 5_000);
    // The worker supersedes the first session with the second, so both replies are now held.
    await waitForCondition({
      condition: () => hub.heldProvidePorts(follower.connection.clientId) >= 2,
      timeout: 5_000,
    });

    const [stale, live] = hub.releaseProvidePorts(follower.connection.clientId);
    await asyncTimeout(opened, 10_000);
    const connected: Connected = await asyncTimeout(follower.connected, 5_000);
    // The first reply's session is already closed on the worker; connecting through it would hang.
    expect(connected.clientToWorker).not.toBe(stale.clientToWorker);
    expect(connected.clientToWorker).toBe(live.clientToWorker);
  });

  test('a coordinator that reports an error fails open() promptly and never steals', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    let leaderWorkers = 0;
    const createWorker = createWorkerFactory(keys.storageLockKey);
    const leader = makeConnection(hub, keys, TIMEOUTS, {
      createWorker: () => {
        leaderWorkers++;
        return createWorker();
      },
    });
    await asyncTimeout(leader.connection.open(), 10_000);
    onTestFinished(async () => {
      await leader.connection.close();
    });

    let coordinator: HubCoordinator | undefined;
    const tab = makeConnection(hub, keys, TIMEOUTS, {
      maxLeaderFailures: 2,
      createCoordinator: () => {
        coordinator = hub.connect();
        // Dead from the start, as a SharedWorker whose script failed to load: nothing ever arrives.
        coordinator.setLink('broken');
        return coordinator;
      },
    });
    onTestFinished(async () => {
      await tab.connection.close();
    });
    const opened = tab.connection.open();
    await sleep(50);
    invariant(coordinator);
    coordinator.failWith(new WorkerError({ message: 'TEST: coordinator worker error: Script error.' }));

    const error = await asyncTimeout(
      opened.then(
        () => {
          throw new Error('open() must not resolve: the coordinator is dead.');
        },
        (err: unknown) => err,
      ),
      2_000,
    );
    invariant(error instanceof Error);
    expect(error.message).toContain('TEST: coordinator worker error');
    expect(diagnosticsOf(error).workerStealCount).toBe(0);

    // The tab keeps failing to hear heartbeats; that must not turn into evictions of the healthy leader.
    await sleep(TIMEOUTS.portTimeout! * 3);
    expect(leaderWorkers).toBe(1);
    expect(tab.failures).toEqual([]);
  });

  test('the stale handle is closed before the replacement connects', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const worker = createRecordingWorker(keys.storageLockKey);

    const events: string[] = [];
    const reconnected = new Trigger();
    const connection = new Client.Connection({
      createWorker: worker.createWorker,
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: TIMEOUTS,
      onConnect: async ({ workerToClient }) => {
        postRunnerReady(workerToClient);
        events.push('connect');
        return {
          close: async () => {
            events.push('close-start');
            await sleep(100);
            events.push('close-end');
          },
        };
      },
    });
    connection.reconnected.on(() => {
      reconnected.wake();
    });
    onTestFinished(async () => {
      await connection.close();
    });

    await asyncTimeout(connection.open(), 10_000);
    worker.requestShutdown();
    await asyncTimeout(reconnected.wait(), 10_000);
    // A consumer typically stores one handle's resources; the next `onConnect` must not race the old `close`.
    expect(events).toEqual(['connect', 'close-start', 'close-end', 'connect']);
  });

  test('a worker that dies does not leak its leader session listener', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const worker = createRecordingWorker(keys.storageLockKey);

    let coordinator: HubCoordinator | undefined;
    const { connection } = makeConnection(hub, keys, TIMEOUTS, {
      createWorker: worker.createWorker,
      createCoordinator: () => {
        coordinator = hub.connect();
        return coordinator;
      },
    });
    onTestFinished(async () => {
      await connection.close();
    });
    await asyncTimeout(connection.open(), 10_000);
    invariant(coordinator);
    const baseline = coordinator.onMessage.listenerCount();

    for (let round = 0; round < 3; round++) {
      const reconnected = connection.reconnected.waitForCount(1);
      worker.requestShutdown();
      await asyncTimeout(reconnected, 10_000);
      await sleep(50);
      expect(coordinator.onMessage.listenerCount()).toBe(baseline);
    }
  });

  test('a session the worker cannot build fails the attempt at once, and the retry is served', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const worker = createRecordingWorker(keys.storageLockKey);
    worker.failNextSessions(1);

    let connects = 0;
    const connection = new Client.Connection({
      createWorker: worker.createWorker,
      createCoordinator: () => hub.connect(),
      leaderLockKey: keys.leaderLockKey,
      leaderTimeouts: TIMEOUTS,
      onConnect: async ({ workerToClient }) => {
        postRunnerReady(workerToClient);
        connects++;
        // A real handle would now hang on a handshake nobody answers, for the full handle timeout.
        return { close: async () => {} };
      },
    });
    onTestFinished(async () => {
      await connection.close();
    });

    await asyncTimeout(connection.open(), 5_000);
    // Connected to a session the worker actually serves, not to the ports of the one it dropped.
    await asyncTimeout(worker.sessionOpened(connection.clientId), 2_000);
    expect(worker.liveSessions()).toEqual([connection.clientId]);
    expect(connects).toBe(1);
  });

  test('a connection whose open() times out tears itself down', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    let workerClosed = false;
    const { connection } = makeConnection(hub, keys, TIMEOUTS, {
      maxLeaderFailures: 2,
      createCoordinator: createBrokenCoordinator,
      createWorker: createWorkerFactory(keys.storageLockKey, { onClose: () => (workerClosed = true) }),
    });

    await expect(connection.open()).rejects.toThrow();
    // `Resource.close()` is a no-op on a resource that never opened, so nothing else can release these.
    await waitForCondition({ condition: () => workerClosed, timeout: 2_000 });
    const { held, pending } = await navigator.locks.query();
    expect((held ?? []).map(({ name }) => name)).not.toContain(keys.leaderLockKey);
    expect((pending ?? []).map(({ name }) => name)).not.toContain(keys.leaderLockKey);
  }, 30_000);
});
