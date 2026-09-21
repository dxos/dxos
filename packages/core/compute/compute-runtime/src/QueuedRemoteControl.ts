//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import type * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';

import * as Process from '@dxos/compute/Process';
import type { Annotation } from '@dxos/echo';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type Command, RemoteCommandQueue } from './remote-command-queue.ts';
import type * as RemoteProcessManager from './RemoteProcessManager.ts';

const toProcessId = Schema.decodeUnknownSync(Process.ID);
const toSpaceId = (value: string): SpaceId => value as SpaceId;

/** States a host will never move out of, and therefore the point at which queued work is dead. */
const TERMINAL_STATES: readonly Process.State[] = [
  Process.State.SUCCEEDED,
  Process.State.FAILED,
  Process.State.TERMINATED,
];

const isTerminal = (state: Process.State): boolean => TERMINAL_STATES.includes(state);

export interface Backoff {
  readonly initial: Duration.Duration;
  readonly max: Duration.Duration;
}

const DEFAULT_BACKOFF: Backoff = { initial: Duration.seconds(1), max: Duration.minutes(1) };

/** How long the flusher sits on an empty queue before re-reading it, absent a wake-up. */
const IDLE_POLL = Duration.seconds(5);

/**
 * Ordering is per PROCESS, not across the whole queue.
 *
 * A command the host will never accept — a process it has dropped, a key it does not host — retries
 * forever, because `Control` reports a rejection and an outage identically (both are defects) and
 * nothing here can tell them apart. What must not happen is that command holding OTHER processes'
 * commands behind it, so the flusher skips a process that is waiting out its backoff and delivers
 * for another one instead.
 *
 * The alternative — discarding a command that has failed for long enough — was tried and is worse:
 * any cutoff long enough not to fire during an outage is also long enough that firing means silently
 * dropping work a user asked for, and the threshold is a guess about the network rather than
 * anything the host actually said.
 */

export interface Options {
  /** Transport to the host. Its failures are defects, which is what marks a command for retry. */
  readonly control: RemoteProcessManager.Control;
  /** Where the command log is persisted — the same store the process registry uses (SQLite in the worker). */
  readonly kvStore: KeyValueStore.KeyValueStore;
  readonly prefix?: string;
  readonly backoff?: Backoff;
  /** Injectable so a test can make command ids deterministic. */
  readonly newId?: () => string;
}

/**
 * A {@link RemoteProcessManager.Control} that also exposes the queue behind it.
 */
export interface Queued extends RemoteProcessManager.Control {
  /**
   * Tells the flusher the host is reachable again, cutting short whatever backoff it is sitting on.
   * Wire this to the edge connection's up-transition; without it a command still goes out, just no
   * sooner than the current backoff allows.
   */
  readonly connected: Effect.Effect<void>;

  /** Commands not yet acknowledged by the host, in delivery order. */
  readonly pending: Effect.Effect<readonly Command[]>;

  /** Resolves once the queue is empty. */
  readonly drained: Effect.Effect<void>;
}

/**
 * Wraps a {@link RemoteProcessManager.Control} in a durable, at-least-once command queue with
 * client-side state that moves immediately.
 *
 * The problem it solves: `Control` is a synchronous request/response surface over a link that is
 * routinely down (an offline client, an edge worker mid-deploy). Called directly, a spawn issued
 * while the link is down is simply lost, and the UI it backs has nothing to show.
 *
 * So every mutating verb here returns as soon as the command is DURABLE, not when the host has
 * applied it:
 *
 * - `spawn` mints a client-side pid, publishes a `STARTING` snapshot and queues the command. A spawn
 *   re-issued under the same `idempotencyKey` resolves to the process already queued or spawned
 *   rather than starting a second one.
 * - `submitInput` buffers the (already encoded) input in the queue, in order.
 * - `terminate` publishes `TERMINATING` at once. If the process's own spawn has not been delivered
 *   yet the whole group is dropped instead — there is nothing on the host to terminate.
 * - Reads (`status`, `list`, `readEvents`) answer from the host and fall back to the local view when
 *   it is unreachable, with the local view taking precedence for a process whose queued command the
 *   host has not seen yet.
 *
 * A background flusher delivers commands in order, retrying with exponential backoff and immediately
 * on {@link Queued.connected}. Each command carries a stable idempotency key, so a delivery whose
 * acknowledgement was lost is safe to repeat: the queue is at-least-once and the host makes it
 * at-most-once. Once a process is observed terminal, its queued commands are dropped — they can
 * never be applied, and retrying them forever would wedge everything behind them.
 */
export const make = (options: Options): Effect.Effect<Queued, never, Scope.Scope> =>
  Effect.gen(function* () {
    const { control, kvStore, prefix, backoff = DEFAULT_BACKOFF } = options;
    const newId = options.newId ?? (() => globalThis.crypto.randomUUID());
    const queue = new RemoteCommandQueue(kvStore, prefix);

    /**
     * The client's view of processes the host has not caught up with, keyed by local pid. An entry
     * exists exactly while a command for that process is outstanding.
     */
    const overlay = new Map<Process.ID, RemoteProcessManager.Snapshot>();
    /** Local pid -> host pid, mirrored from the durable alias map so reads can resolve synchronously. */
    const aliases = new Map<Process.ID, Process.ID>();
    const localPids = new Map<Process.ID, Process.ID>();

    let wake = yield* Deferred.make<void>();

    /**
     * Earliest time each process's next delivery may be attempted, by local pid.
     *
     * In memory rather than durable: it is a backoff, so losing it on reload costs one early retry
     * and nothing else. Keyed by process because that is the granularity ordering needs.
     */
    const retryAt = new Map<Process.ID, number>();

    /**
     * Wakes the flusher: completes the current latch and installs a fresh one.
     *
     * Clears the per-process backoffs too. They are a guess that the host is still unreachable, and
     * a wake-up is news to the contrary — without this, `connected` would end the flusher's sleep
     * only for it to find every process still cooling off and go back to sleep.
     */
    const signal = Effect.gen(function* () {
      retryAt.clear();
      const current = wake;
      wake = yield* Deferred.make<void>();
      yield* Deferred.succeed(current, undefined);
    });

    const setAlias = (localPid: Process.ID, remotePid: Process.ID): Effect.Effect<void> =>
      Effect.sync(() => {
        aliases.set(localPid, remotePid);
        localPids.set(remotePid, localPid);
      }).pipe(Effect.andThen(queue.setAlias(localPid, remotePid)));

    /** The pid to address the host with: the host's own, once it has told us one. */
    const remotePidOf = (localPid: Process.ID): Process.ID => aliases.get(localPid) ?? localPid;
    /** The overlay key for a pid the host reported. */
    const localPidOf = (remotePid: Process.ID): Process.ID => localPids.get(remotePid) ?? remotePid;

    /** Drops a process the host can no longer act on, and everything queued for it. */
    const forget = (localPid: Process.ID): Effect.Effect<void> =>
      Effect.sync(() => {
        overlay.delete(localPid);
        const remote = aliases.get(localPid);
        aliases.delete(localPid);
        if (remote !== undefined) {
          localPids.delete(remote);
        }
      }).pipe(Effect.andThen(queue.purgeProcess(localPid)));

    /**
     * Folds a host snapshot into the local view: a terminal process releases its queued commands,
     * and a process this client has already asked to terminate keeps reading as TERMINATING until the
     * host agrees.
     */
    const reconcile = (snapshot: RemoteProcessManager.Snapshot): Effect.Effect<RemoteProcessManager.Snapshot> =>
      Effect.gen(function* () {
        const localPid = localPidOf(snapshot.pid);
        if (isTerminal(snapshot.state)) {
          yield* forget(localPid);
          return snapshot;
        }
        const local = overlay.get(localPid);
        return local?.state === Process.State.TERMINATING
          ? { ...snapshot, state: Process.State.TERMINATING }
          : snapshot;
      });

    const startingSnapshot = (
      localPid: Process.ID,
      request: RemoteProcessManager.SpawnRequest,
    ): RemoteProcessManager.Snapshot => ({
      pid: localPid,
      parentPid: request.parentPid ?? null,
      key: request.key,
      params: { name: request.name ?? null, annotations: (request.annotations ?? {}) as Annotation.Dictionary },
      environment: { space: request.spaceId, ...request.environment },
      state: Process.State.STARTING,
      error: null,
      startedAt: Date.now(),
      completedAt: Option.none(),
      alarmDueAt: null,
      metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
    });

    // Rebuild the local view from the durable log: a reload mid-flight must still show the process
    // the user spawned, in the state the queue says it is in.
    for (const [localPid, remotePid] of Object.entries(yield* queue.aliases())) {
      aliases.set(toProcessId(localPid), remotePid);
      localPids.set(remotePid, toProcessId(localPid));
    }
    for (const command of yield* queue.list()) {
      switch (command.payload._tag) {
        case 'spawn':
          overlay.set(
            command.localPid,
            startingSnapshot(command.localPid, {
              spaceId: toSpaceId(command.payload.spaceId),
              key: command.payload.key,
              ...(command.payload.name !== null ? { name: command.payload.name } : {}),
              ...(command.payload.parentPid !== null ? { parentPid: command.payload.parentPid } : {}),
              environment: command.payload.environment as Process.Environment,
              annotations: command.payload.annotations,
            }),
          );
          break;
        case 'terminate': {
          const existing = overlay.get(command.localPid);
          if (existing) {
            overlay.set(command.localPid, { ...existing, state: Process.State.TERMINATING });
          }
          break;
        }
        case 'submitInput':
          break;
      }
    }

    const deliver = (command: Command): Effect.Effect<void> => {
      switch (command.payload._tag) {
        case 'spawn': {
          const payload = command.payload;
          return control
            .spawn({
              spaceId: toSpaceId(payload.spaceId),
              key: payload.key,
              ...(payload.name !== null ? { name: payload.name } : {}),
              ...(payload.parentPid !== null ? { parentPid: payload.parentPid } : {}),
              environment: payload.environment as Process.Environment,
              annotations: payload.annotations,
              idempotencyKey: command.id,
            })
            .pipe(
              Effect.flatMap((snapshot) =>
                Effect.gen(function* () {
                  yield* setAlias(command.localPid, snapshot.pid);
                  const local = overlay.get(command.localPid);
                  // A terminate queued behind this spawn must keep reading as TERMINATING; anything
                  // else is now the host's to report.
                  if (local?.state !== Process.State.TERMINATING) {
                    overlay.delete(command.localPid);
                  }
                }),
              ),
            );
        }
        case 'submitInput':
          return control.submitInput({
            spaceId: toSpaceId(command.payload.spaceId),
            pid: remotePidOf(command.localPid),
            input: command.payload.value,
            idempotencyKey: command.id,
          });
        case 'terminate':
          return control
            .terminate({
              spaceId: toSpaceId(command.payload.spaceId),
              pid: remotePidOf(command.localPid),
              idempotencyKey: command.id,
            })
            .pipe(Effect.andThen(forget(command.localPid)));
      }
    };

    const backoffFor = (attempts: number): Duration.Duration => {
      const millis = Duration.toMillis(backoff.initial) * 2 ** Math.max(0, attempts - 1);
      return Duration.millis(Math.min(millis, Duration.toMillis(backoff.max)));
    };

    /** Sleeps, or returns early when the latch captured before the queue read is signalled. */
    const waitFor = (latch: Deferred.Deferred<void>, duration: Duration.Duration): Effect.Effect<void> =>
      Effect.raceFirst(Effect.sleep(duration), Deferred.await(latch)).pipe(Effect.asVoid);

    const step = Effect.gen(function* () {
      // Captured before the read, so a command enqueued while this fiber is between the two does not
      // signal an old latch and leave the flusher asleep.
      const latch = wake;
      const commands = yield* queue.list();
      if (commands.length === 0) {
        return yield* waitFor(latch, IDLE_POLL);
      }
      const now = Date.now();
      // The first command whose process is not waiting out a backoff. Scanning in queue order is
      // what keeps ONE process's commands in order while letting another's overtake them.
      const command = commands.find((entry) => (retryAt.get(entry.localPid) ?? 0) <= now);
      if (command === undefined) {
        // Everything queued belongs to a process that is cooling off; sleep until the first is due.
        const earliest = Math.min(...commands.map((entry) => retryAt.get(entry.localPid) ?? 0));
        return yield* waitFor(latch, Duration.millis(Math.max(0, earliest - now)));
      }
      const exit = yield* deliver(command).pipe(Effect.exit);
      if (Exit.isSuccess(exit)) {
        retryAt.delete(command.localPid);
        return yield* queue.complete(command.id);
      }
      const { attempts } = yield* queue.recordAttempt(command.id);
      const delay = backoffFor(attempts);
      // The process waits; the flusher does not. It comes straight back round and delivers for some
      // other process, which is the whole point of the per-process backoff.
      retryAt.set(command.localPid, Date.now() + Duration.toMillis(delay));
      log.warn('remote command delivery failed; will retry', {
        command: command.payload._tag,
        id: command.id,
        pid: command.localPid,
        attempts,
        delay: Duration.toMillis(delay),
      });
    });

    yield* Effect.forkScoped(Effect.forever(step));

    const enqueue = (localPid: Process.ID, id: string, payload: Command['payload']): Effect.Effect<void> =>
      queue.enqueue({ id, localPid, payload }).pipe(Effect.andThen(signal));

    return {
      spawn: (request: RemoteProcessManager.SpawnRequest) =>
        Effect.gen(function* () {
          const id = request.idempotencyKey ?? newId();
          // Derived from the idempotency key rather than minted fresh, so the "is there an existing
          // one that matches" answer survives a reload: the same key addresses the same process.
          const localPid = toProcessId(`local:${id}`);
          const queued = overlay.get(localPid);
          if (queued) {
            return queued;
          }
          if (aliases.has(localPid)) {
            // Already spawned under this key — report what the host says, or the last thing we knew.
            return yield* control.status({ spaceId: request.spaceId, pid: remotePidOf(localPid) }).pipe(
              Effect.flatMap(reconcile),
              Effect.catchCause(() => Effect.succeed(startingSnapshot(localPid, request))),
            );
          }
          const snapshot = startingSnapshot(localPid, request);
          overlay.set(localPid, snapshot);
          yield* enqueue(localPid, id, {
            _tag: 'spawn',
            spaceId: request.spaceId,
            key: request.key,
            name: request.name ?? null,
            parentPid: request.parentPid ?? null,
            environment: (request.environment ?? {}) as { space?: string; conversation?: string },
            annotations: request.annotations ?? ({} as Annotation.Dictionary),
          });
          return snapshot;
        }),

      submitInput: ({ spaceId, pid, input }) =>
        enqueue(localPidOf(pid), newId(), { _tag: 'submitInput', spaceId, pid, value: input }),

      terminate: ({ spaceId, pid }) =>
        Effect.gen(function* () {
          const localPid = localPidOf(pid);
          const pending = yield* queue.list();
          const spawnPending = pending.some(
            (command) => command.localPid === localPid && command.payload._tag === 'spawn',
          );
          if (spawnPending) {
            // The host has never heard of this process, so there is nothing to terminate there —
            // dropping the group is both the correct end state and the only one that does not leak
            // a process the caller has already abandoned.
            //
            // The local view is dropped with it rather than left reading TERMINATED: the queue is
            // the only durable record, so a snapshot kept in memory here would be a state this
            // client reports until it reloads and then never again. A process that never reached
            // the host is simply not one, and both halves of that answer now agree.
            return yield* forget(localPid);
          }
          const existing = overlay.get(localPid);
          overlay.set(localPid, {
            ...(existing ?? startingSnapshot(localPid, { spaceId, key: 'unknown' })),
            pid,
            state: Process.State.TERMINATING,
          });
          // Keyed by process: terminating twice is one command, however often it is asked for.
          yield* enqueue(localPid, `terminate:${localPid}`, { _tag: 'terminate', spaceId, pid });
        }),

      status: ({ spaceId, pid }) =>
        Effect.gen(function* () {
          const localPid = localPidOf(pid);
          const local = overlay.get(localPid);
          if (local !== undefined && !aliases.has(localPid) && localPid === pid) {
            // Not yet spawned on the host: it could only answer "no such process".
            return local;
          }
          return yield* control.status({ spaceId, pid: remotePidOf(localPid) }).pipe(
            Effect.flatMap(reconcile),
            Effect.catchCause((cause) => (local !== undefined ? Effect.succeed(local) : Effect.failCause(cause))),
          );
        }),

      list: (request) =>
        Effect.gen(function* () {
          const hosted = yield* control.list(request).pipe(Effect.catchCause(() => Effect.succeed([])));
          const reconciled = yield* Effect.forEach(hosted, reconcile);
          const known = new Set(reconciled.map((snapshot) => snapshot.pid));
          const pendingOnly = [...overlay.values()].filter(
            (snapshot) =>
              !known.has(snapshot.pid) &&
              snapshot.environment.space === request.spaceId &&
              (request.key === undefined || snapshot.key === request.key),
          );
          return [...reconciled, ...pendingOnly].filter(
            (snapshot) => request.state === undefined || snapshot.state === request.state,
          );
        }),

      readEvents: ({ spaceId, pid, cursor }) =>
        Effect.gen(function* () {
          const localPid = localPidOf(pid);
          const local = overlay.get(localPid);
          if (local !== undefined && !aliases.has(localPid) && localPid === pid) {
            // No host process yet, so no events either — an empty page at the caller's cursor.
            return { events: [], cursor: 0, truncated: false, snapshot: local };
          }
          return yield* control.readEvents({ spaceId, pid: remotePidOf(localPid), cursor }).pipe(
            Effect.flatMap((page) => reconcile(page.snapshot).pipe(Effect.map((snapshot) => ({ ...page, snapshot })))),
            Effect.catchCause((cause) =>
              local !== undefined
                ? Effect.succeed({ events: [], cursor, truncated: false, snapshot: local })
                : Effect.failCause(cause),
            ),
          );
        }),

      // Not queueable: an RPC client is a live duplex channel, so there is nothing to buffer.
      makeRpcClient: (target) => control.makeRpcClient({ ...target, pid: remotePidOf(localPidOf(target.pid)) }),

      connected: signal,

      pending: queue.list(),

      drained: Effect.gen(function* () {
        while ((yield* queue.list()).length > 0) {
          yield* Effect.sleep(Duration.millis(5));
        }
      }),
    } satisfies Queued;
  });
