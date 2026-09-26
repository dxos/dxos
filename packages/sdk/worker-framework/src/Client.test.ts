//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, sleep, waitForCondition } from '@dxos/async';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { type LogEntry, LogLevel, type LogProcessor, log } from '@dxos/log';

import * as Client from './Client.ts';
import { WorkerConnectionError, WorkerNotTerminableError, WorkerTerminationError } from './errors.ts';
import { displaceChannelFor } from './internal/displace-channel.ts';
import { LOCK_OR_RPC_WAIT_TIMEOUT } from './internal/locks.ts';
import {
  type WorkerHandle,
  createBrokenCoordinator,
  createHub,
  createRecordingWorker,
  createWorkerFactory,
  diagnosticsOf,
  makeConnection,
  postStubSession,
  uniqueKeys,
} from './testing/harness.ts';
import * as Worker from './Worker.ts';
import * as WorkerProtocol from './WorkerProtocol.ts';

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

describe('Connection build mismatch', () => {
  const TIMEOUTS: Client.LeaderTimeouts = {
    heartbeatInterval: 50,
    staleTimeout: 1_000,
    portTimeout: 3_000,
    retryBackoff: 20,
  };

  /** Opens a follower whose boot is expected to fail while its leader runs another build. */
  const openFollower = (follower: ReturnType<typeof makeConnection>) => {
    void follower.connection.open().catch(() => {});
    onTestFinished(async () => {
      await follower.connection.close();
    });
  };

  test('a follower refuses the port of a leader running another build, and both sides hear of it', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const leaderMismatch = new Trigger<Client.BuildMismatch>();
    const leader = makeConnection(hub, keys, TIMEOUTS, {
      buildId: 'build-old',
      onBuildMismatch: (mismatch) => leaderMismatch.wake(mismatch),
    });
    await asyncTimeout(leader.connection.open(), 5_000);
    onTestFinished(async () => {
      await leader.connection.close();
    });
    await asyncTimeout(leader.connected, 5_000);

    const followerMismatch = new Trigger<Client.BuildMismatch>();
    let followerConnected = false;
    const follower = makeConnection(hub, keys, TIMEOUTS, {
      buildId: 'build-new',
      onBuildMismatch: (mismatch) => followerMismatch.wake(mismatch),
    });
    void follower.connected.then(() => {
      followerConnected = true;
    });
    openFollower(follower);

    expect(await asyncTimeout(followerMismatch.wait(), 5_000)).toEqual({
      role: 'follower',
      local: 'build-new',
      remote: 'build-old',
    });
    expect(await asyncTimeout(leaderMismatch.wait(), 5_000)).toEqual({
      role: 'leader',
      local: 'build-old',
      remote: 'build-new',
    });
    await sleep(200);
    expect(followerConnected).toBe(false);
  });

  test('a leader that reports no build counts as another build', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    // A leader from before build ids were exchanged.
    const leader = makeConnection(hub, keys, TIMEOUTS);
    await asyncTimeout(leader.connection.open(), 5_000);
    onTestFinished(async () => {
      await leader.connection.close();
    });
    await asyncTimeout(leader.connected, 5_000);

    const followerMismatch = new Trigger<Client.BuildMismatch>();
    const follower = makeConnection(hub, keys, TIMEOUTS, {
      buildId: 'build-new',
      onBuildMismatch: (mismatch) => followerMismatch.wake(mismatch),
    });
    openFollower(follower);

    expect(await asyncTimeout(followerMismatch.wait(), 5_000)).toEqual({
      role: 'follower',
      local: 'build-new',
      remote: undefined,
    });
  });

  test('a follower on the same build connects', async () => {
    const hub = createHub();
    const keys = uniqueKeys();
    const mismatches: Client.BuildMismatch[] = [];

    const leader = makeConnection(hub, keys, TIMEOUTS, {
      buildId: 'build-a',
      onBuildMismatch: (m) => mismatches.push(m),
    });
    await asyncTimeout(leader.connection.open(), 5_000);
    onTestFinished(async () => {
      await leader.connection.close();
    });
    await asyncTimeout(leader.connected, 5_000);

    const follower = makeConnection(hub, keys, TIMEOUTS, {
      buildId: 'build-a',
      onBuildMismatch: (m) => mismatches.push(m),
    });
    await asyncTimeout(follower.connection.open(), 5_000);
    onTestFinished(async () => {
      await follower.connection.close();
    });
    expect((await asyncTimeout(follower.connected, 5_000)).isOwner).toBe(false);
    expect(mismatches).toEqual([]);
  });

  test('a refused follower connects once the older leader steps down', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const leader = makeConnection(hub, keys, TIMEOUTS, { buildId: 'build-old' });
    await asyncTimeout(leader.connection.open(), 5_000);
    await asyncTimeout(leader.connected, 5_000);

    const refused = new Trigger();
    const follower = makeConnection(hub, keys, TIMEOUTS, {
      buildId: 'build-new',
      onBuildMismatch: () => refused.wake(),
    });
    const opened = follower.connection.open();
    onTestFinished(async () => {
      await follower.connection.close();
    });
    await asyncTimeout(refused.wait(), 5_000);

    // What the app does with the older tab: reload it, which releases the leader lock.
    await leader.connection.close();

    await asyncTimeout(opened, 10_000);
    expect((await asyncTimeout(follower.connected, 5_000)).isOwner).toBe(true);
  });
});

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

  test('a wedged worker that ignores displacement is terminated by the tab that owns it', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const wedgeable = createWedgeableWorkerFactory(keys.storageLockKey);
    const { connection, connected } = makeConnection(hub, keys, undefined, { createWorker: wedgeable.createWorker });
    onTestFinished(async () => {
      await connection.close();
    });
    await asyncTimeout(connection.open(), 10_000);
    await asyncTimeout(connected, 5_000);

    // From here the worker services nothing, so it never runs `shutdown` and holds both the storage
    // and the liveness lock — the cooperative path from #13269 has nothing left to work with.
    wedgeable.wedge();

    const entries: LogEntry[] = [];
    const processor: LogProcessor = (_config, entry) => {
      entries.push(entry);
    };
    const removeProcessor = log.addProcessor(processor);
    onTestFinished(removeProcessor);

    // The worker another tab spawns for the same storage lock. Its grace period is injected rather
    // than waited out, so the escalation is observed by the terminations it causes, not by a clock.
    const successor = startBareWorker(keys.storageLockKey, { displaceGraceTimeout: 50 });
    await asyncTimeout(wedgeable.terminated, 10_000);
    await asyncTimeout(successor.listening, 10_000);

    // A forced kill is a fault, so it must reach error telemetry — the PostHog processor forwards
    // an entry only when it carries an `Error`, which a bare `log.warn` never does.
    const reported = entries.filter((entry): entry is LogEntry & { error: WorkerTerminationError } => {
      return entry.error instanceof WorkerTerminationError;
    });
    expect(reported).toHaveLength(1);
    expect(reported[0].level).to.eq(LogLevel.ERROR);
    expect(reported[0].error.context).to.deep.contain({
      storageLockKey: keys.storageLockKey,
      graceTimeout: 50,
      raisedBy: 'tab',
    });
  }, 30_000);

  test('an escalation terminates the wedged incumbent and no other tab on that storage lock', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    // Tab 1: the worker that holds the storage lock, wedged once it is serving.
    const wedgeable = createWedgeableWorkerFactory(keys.storageLockKey);
    const incumbent = makeConnection(hub, keys, undefined, { createWorker: wedgeable.createWorker });
    onTestFinished(async () => {
      await incumbent.connection.close();
    });
    await asyncTimeout(incumbent.connection.open(), 10_000);
    await asyncTimeout(incumbent.connected, 5_000);
    wedgeable.wedge();

    // Tabs 2 and 3: two more tabs listening on the same displacement channel. The escalation is
    // broadcast, so an issuer-only check has both of them kill their own healthy worker.
    const bystanders = [
      startBystanderTab({ leaderLockKey: `${keys.leaderLockKey}-bystander-1`, storageLockKey: keys.storageLockKey }),
      startBystanderTab({ leaderLockKey: `${keys.leaderLockKey}-bystander-2`, storageLockKey: keys.storageLockKey }),
    ];
    for (const bystander of bystanders) {
      onTestFinished(async () => {
        await bystander.close();
      });
      await asyncTimeout(bystander.open(), 10_000);
    }

    const entries: LogEntry[] = [];
    const processor: LogProcessor = (_config, entry) => {
      entries.push(entry);
    };
    const removeProcessor = log.addProcessor(processor);
    onTestFinished(removeProcessor);

    // Tab 4's worker, queued behind the wedged incumbent and escalating once its grace expires.
    const successor = startBareWorker(keys.storageLockKey, { displaceGraceTimeout: 50 });
    await asyncTimeout(wedgeable.terminated, 10_000);
    await asyncTimeout(successor.listening, 10_000);
    // The successor's lock is causally downstream of the incumbent's tab alone; the broadcast reaches
    // each bystander on its own schedule, so each one's verdict is awaited rather than assumed.
    await waitForCondition({
      condition: () => bystanders.every((bystander) => bystander.wasProbed() || bystander.wasTerminated()),
      timeout: 10_000,
    });

    for (const bystander of bystanders) {
      expect(bystander.wasTerminated()).to.be.false;
    }
    // One incident, so exactly one error reaches telemetry — a spurious kill would report its own.
    const reported = entries.filter((entry) => entry.error instanceof WorkerTerminationError);
    expect(reported).toHaveLength(1);
  }, 40_000);

  test('a malformed escalation is ignored, and the well-formed one that follows still lands', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const wedgeable = createWedgeableWorkerFactory(keys.storageLockKey);
    const { connection, connected } = makeConnection(hub, keys, undefined, { createWorker: wedgeable.createWorker });
    onTestFinished(async () => {
      await connection.close();
    });
    await asyncTimeout(connection.open(), 10_000);
    await asyncTimeout(connected, 5_000);
    wedgeable.wedge();

    const entries: LogEntry[] = [];
    const processor: LogProcessor = (_config, entry) => {
      entries.push(entry);
    };
    const removeProcessor = log.addProcessor(processor);
    onTestFinished(removeProcessor);

    // A `terminate` with no issuer would fail the self-check and kill whatever worker received it.
    const intruder = new BroadcastChannel(displaceChannelFor(keys.storageLockKey));
    onTestFinished(() => intruder.close());
    intruder.postMessage({ action: 'terminate' });
    intruder.postMessage({ action: 'not-an-action' });

    // The well-formed escalation that follows is the edge the assertions hang on: the kill it causes
    // carries its issuer, so a kill caused by either message above shows up as a different issuer.
    intruder.postMessage({
      action: 'terminate',
      issuerId: 'well-formed-issuer',
      storageLockKey: keys.storageLockKey,
      graceTimeout: 50,
    });
    await asyncTimeout(wedgeable.terminated, 10_000);

    const reported = entries.filter((entry) => entry.error instanceof WorkerTerminationError);
    expect(reported).toHaveLength(1);
    expect(diagnosticsOf(reported[0].error)).to.deep.contain({ issuerId: 'well-formed-issuer' });
  }, 30_000);

  test('a self-issued escalation is ignored by the tab that owns the issuing worker', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const wedgeable = createWedgeableWorkerFactory(keys.storageLockKey);
    const { connection, connected } = makeConnection(hub, keys, undefined, { createWorker: wedgeable.createWorker });
    onTestFinished(async () => {
      await connection.close();
    });
    await asyncTimeout(connection.open(), 10_000);
    await asyncTimeout(connected, 5_000);
    // Wedged, so the liveness and probe checks both say "kill": only the issuer check stands between
    // this escalation and the worker.
    wedgeable.wedge();
    const ownWorkerId = wedgeable.workerId();
    invariant(ownWorkerId, 'the worker advertises its id in `ready`');

    const entries: LogEntry[] = [];
    const processor: LogProcessor = (_config, entry) => {
      entries.push(entry);
    };
    const removeProcessor = log.addProcessor(processor);
    onTestFinished(removeProcessor);

    const peer = new BroadcastChannel(displaceChannelFor(keys.storageLockKey));
    onTestFinished(() => peer.close());
    peer.postMessage({
      action: 'terminate',
      issuerId: ownWorkerId,
      storageLockKey: keys.storageLockKey,
      graceTimeout: 50,
    });
    // The kill this one causes names its issuer, so a kill caused by the self-issued message above
    // shows up with the wrong one; without it, "nothing happened" could not be told from "not yet".
    peer.postMessage({
      action: 'terminate',
      issuerId: 'another-worker',
      storageLockKey: keys.storageLockKey,
      graceTimeout: 50,
    });
    await asyncTimeout(wedgeable.terminated, 10_000);

    const reported = entries.filter((entry) => entry.error instanceof WorkerTerminationError);
    expect(reported).toHaveLength(1);
    expect(diagnosticsOf(reported[0].error)).to.deep.contain({ issuerId: 'another-worker' });
  }, 30_000);

  test('a wedged worker behind a handle that cannot be terminated is reported, not silently skipped', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const wedgeable = createWedgeableWorkerFactory(keys.storageLockKey, { terminable: false });
    const { connection, connected } = makeConnection(hub, keys, undefined, { createWorker: wedgeable.createWorker });
    onTestFinished(async () => {
      await connection.close();
    });
    await asyncTimeout(connection.open(), 10_000);
    await asyncTimeout(connected, 5_000);
    wedgeable.wedge();

    const entries: LogEntry[] = [];
    const processor: LogProcessor = (_config, entry) => {
      entries.push(entry);
    };
    const removeProcessor = log.addProcessor(processor);
    onTestFinished(removeProcessor);

    startBareWorker(keys.storageLockKey, { displaceGraceTimeout: 50 });
    await waitForCondition({
      condition: () => entries.some((entry) => entry.error instanceof WorkerNotTerminableError),
      timeout: 10_000,
    });
    const failure = entries.find((entry) => entry.error instanceof WorkerNotTerminableError);
    invariant(failure);
    expect(failure.level).to.eq(LogLevel.ERROR);
    expect(diagnosticsOf(failure.error)).to.deep.contain({
      storageLockKey: keys.storageLockKey,
      graceTimeout: 50,
    });
    // The escalation could not free the lock, so the successor is still queued — the honest outcome
    // for a handle with no termination capability, rather than a report of a kill that never happened.
    expect(entries.filter((entry) => entry.error instanceof WorkerTerminationError)).toHaveLength(0);
  }, 30_000);

  test('a ready message without the displacement fields still connects, escalation aside', async () => {
    const keys = uniqueKeys();
    const livenessLockKey = `${keys.storageLockKey}/liveness/legacy`;
    const releaseLiveness = new Trigger();
    const livenessHeld = new Trigger();
    void navigator.locks.request(livenessLockKey, async () => {
      livenessHeld.wake();
      await releaseLiveness.wait();
    });
    await asyncTimeout(livenessHeld.wait(), 5_000);
    onTestFinished(() => {
      releaseLiveness.wake();
    });

    // A worker built before `workerId`/`displaceChannel` existed, which a tab can meet across an
    // app deploy: it cannot be escalated against, but it must still be usable.
    const createWorker = () => {
      const channel = new MessageChannel();
      channel.port1.start();
      channel.port1.addEventListener('message', (event) => {
        const message: WorkerProtocol.DedicatedWorkerMessage = (
          event as MessageEvent<WorkerProtocol.DedicatedWorkerMessage>
        ).data;
        if (message.type === 'init') {
          channel.port1.postMessage({ type: 'ready', livenessLockKey });
        } else if (message.type === 'start-session') {
          postStubSession(channel.port1, message.clientId);
        }
      });
      channel.port1.postMessage({ type: 'listening' } satisfies WorkerProtocol.DedicatedWorkerMessage);
      return channel.port2;
    };

    const { connection } = makeConnection(createHub(), keys, undefined, { createWorker });
    onTestFinished(async () => {
      await connection.close();
    });
    await asyncTimeout(connection.open(), 10_000);
  }, 20_000);

  // DX-1293 follow-up: 5s killed workers that were merely slow. The escalating worker is itself
  // terminated once its tab's `LOCK_OR_RPC_WAIT_TIMEOUT` budget expires, so a grace period at or
  // above that budget would never fire.
  test('the displacement grace period is long, and still inside the leader session budget', () => {
    expect(Worker.DEFAULT_DISPLACE_GRACE_TIMEOUT).toBeGreaterThanOrEqual(10_000);
    expect(Worker.DEFAULT_DISPLACE_GRACE_TIMEOUT).toBeLessThan(LOCK_OR_RPC_WAIT_TIMEOUT);
  });

  test('a leader session opens against a storage lock a wedged worker still holds', async () => {
    const hub = createHub();
    const keys = uniqueKeys();

    const wedgeable = createWedgeableWorkerFactory(keys.storageLockKey);
    const incumbent = makeConnection(hub, keys, undefined, { createWorker: wedgeable.createWorker });
    onTestFinished(async () => {
      await incumbent.connection.close();
    });
    await asyncTimeout(incumbent.connection.open(), 10_000);
    await asyncTimeout(incumbent.connected, 5_000);
    wedgeable.wedge();

    // Two tabs each leading their own election over one storage lock: the broken-coordinator-link
    // state that puts a second worker on a lock the first one still owns.
    const successorKeys = { leaderLockKey: `${keys.leaderLockKey}-successor`, storageLockKey: keys.storageLockKey };
    const successor = makeConnection(createHub(), successorKeys, undefined, {
      createWorker: createWorkerFactory(keys.storageLockKey, { displaceGraceTimeout: 50 }),
    });
    onTestFinished(async () => {
      await successor.connection.close();
    });

    // Budgeted past `LOCK_OR_RPC_WAIT_TIMEOUT` so a worker that never takes the storage lock fails
    // this with the reported "opening worker leader session" timeout rather than a bare test timeout.
    await asyncTimeout(successor.connection.open(), 25_000);
    await asyncTimeout(successor.connected, 5_000);
    await asyncTimeout(wedgeable.terminated, 5_000);
  }, 40_000);
});

/**
 * Runs the real worker loop over a MessageChannel with no tab attached, exposing the two protocol
 * milestones the displacement handshake turns on: `listening` (this worker holds the storage lock
 * and serves) and the endpoint closing (it stood down).
 */
const startBareWorker = (storageLockKey: string, { displaceGraceTimeout }: { displaceGraceTimeout?: number } = {}) => {
  const channel = new MessageChannel();
  channel.port1.start();
  channel.port2.start();
  const listening = new Trigger();
  const closed = new Trigger();
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
    displaceGraceTimeout,
    createRuntime: () => Effect.succeed({ createSession: () => Effect.never }),
  });
  return { listening: listening.wait(), closed: closed.wait() };
};

/**
 * A worker that can be wedged the way a busy CPU loop wedges one — nothing delivered into it again,
 * its displacement channel included — and whose handle carries the `terminate()` capability a real
 * `Worker` has, so the tab can stand it down without its cooperation.
 */
const createWedgeableWorkerFactory = (storageLockKey: string, { terminable = true }: { terminable?: boolean } = {}) => {
  let handle: WorkerHandle | undefined;
  const terminated = new Trigger();
  const createWorker = createWorkerFactory(storageLockKey, {
    terminable,
    onCreate: (created) => {
      handle = created;
    },
    onClose: () => terminated.wake(),
  });

  return {
    createWorker,
    wedge: () => {
      invariant(handle, 'the worker must have been created before it can be wedged');
      handle.wedge();
    },
    terminated: terminated.wait(),
    /** The id the worker advertised in `ready`; undefined until it has. */
    workerId: () => handle?.workerId,
  };
};

/**
 * A tab whose worker is ready and healthy but is not the one holding the storage lock — the
 * bystander an escalation reaches on any storage lock with three or more tabs.
 *
 * Its worker is a stub rather than {@link Worker.run}, because a real worker advertises `ready` only
 * from inside the storage lock grant, so this state cannot be staged with the real loop; the tab
 * side under test — the displacement channel listener and what it does with an escalation — is the
 * production one.
 */
const startBystanderTab = (keys: { leaderLockKey: string; storageLockKey: string }) => {
  const workerId = `bystander-${crypto.randomUUID()}`;
  const livenessLockKey = `${keys.storageLockKey}/liveness/${workerId}`;
  const releaseLiveness = new Trigger();
  const livenessHeld = new Trigger();
  void navigator.locks.request(livenessLockKey, async () => {
    livenessHeld.wake();
    await releaseLiveness.wait();
  });
  const ready = new Trigger();
  let terminated = false;
  let probed = false;

  const createWorker = () => {
    const channel = new MessageChannel();
    channel.port1.start();
    channel.port1.addEventListener('message', (event) => {
      const message: WorkerProtocol.DedicatedWorkerMessage = (
        event as MessageEvent<WorkerProtocol.DedicatedWorkerMessage>
      ).data;
      switch (message.type) {
        case 'init':
          channel.port1.postMessage({
            type: 'ready',
            livenessLockKey,
            workerId,
            displaceChannel: displaceChannelFor(keys.storageLockKey),
          } satisfies WorkerProtocol.DedicatedWorkerMessage);
          ready.wake();
          break;
        case 'ping':
          probed = true;
          channel.port1.postMessage({
            type: 'pong',
            nonce: message.nonce,
          } satisfies WorkerProtocol.DedicatedWorkerMessage);
          break;
        case 'start-session':
          postStubSession(channel.port1, message.clientId);
          break;
      }
    });
    channel.port1.postMessage({ type: 'listening' } satisfies WorkerProtocol.DedicatedWorkerMessage);
    return Object.assign(channel.port2, {
      terminate: () => {
        terminated = true;
      },
    });
  };

  const { connection } = makeConnection(createHub(), keys, undefined, { createWorker });
  return {
    connection,
    open: async () => {
      await livenessHeld.wait();
      await connection.open();
      await ready.wait();
    },
    close: async () => {
      await connection.close();
      releaseLiveness.wake();
    },
    /** Whether this tab killed its own worker, which only the incumbent's tab may do. */
    wasTerminated: () => terminated,
    /** Whether this tab probed its worker, which it does only on an escalation it could not rule out. */
    wasProbed: () => probed,
  };
};
