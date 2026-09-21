//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import type * as Rpc from 'effect/unstable/rpc/Rpc';

import * as Process from '@dxos/compute/Process';

import type * as ProcessManager from '../ProcessManager.ts';
import type * as RemoteProcessManager from '../RemoteProcessManager.ts';

/**
 * A local {@link ProcessManager.Manager} dressed up as a remote host, plus a link to it that a test
 * can cut and restore.
 *
 * This is the substrate for end-to-end tests of the queued client: it makes "the edge" a second,
 * ordinary process manager in the same process, so a test can assert what the HOST ended up doing
 * (which processes exist, which inputs arrived, in what order, how many times) rather than what a
 * mock was called with.
 */

/** A host that deduplicates by idempotency key, as a real one must for at-most-once delivery. */
export interface Host extends RemoteProcessManager.Control {
  /** Inputs the host actually applied, per process, in arrival order. */
  readonly applied: Effect.Effect<readonly { readonly pid: Process.ID; readonly input: unknown }[]>;
  /** Commands the host recognised as a redelivery and ignored. */
  readonly duplicates: Effect.Effect<number>;
}

export interface Options {
  readonly manager: ProcessManager.Manager;
  /** Processes this host hosts, resolved by `Process.key` — a definition cannot cross the wire. */
  readonly definitions: readonly Process.Process<any, any, any, any>[];
}

/**
 * Adapts a local process manager to the remote {@link RemoteProcessManager.Control} surface.
 *
 * Deduplicates every verb carrying an `idempotencyKey`, which is what makes the client's
 * at-least-once queue safe: a redelivered spawn returns the process the first delivery created and a
 * redelivered input is dropped.
 */
export const makeHost = (options: Options): Effect.Effect<Host> =>
  Effect.gen(function* () {
    const handles = new Map<Process.ID, ProcessManager.Handle.Any>();
    const events = new Map<Process.ID, RemoteProcessManager.Event[]>();
    const inputCounts = new Map<Process.ID, number>();
    const applied: { pid: Process.ID; input: unknown }[] = [];
    /** Idempotency key -> the pid a spawn produced, or `null` for a verb with no result. */
    const seen = new Map<string, Process.ID | null>();
    let duplicates = 0;

    const definitionFor = (key: string) => options.definitions.find((definition) => definition.key === key);

    const snapshot = (handle: ProcessManager.Handle.Any): RemoteProcessManager.Snapshot => ({
      pid: handle.pid,
      parentPid: handle.parentId,
      key: handle.key,
      params: handle.params,
      environment: handle.environment,
      state: handle.status.state,
      // The local handle carries the failure as an `Exit`, not a `SerializedError`; a test asserts on
      // state, so it is not worth re-encoding here.
      error: null,
      startedAt: handle.status.startedAt.getTime(),
      completedAt: Option.map(handle.status.completedAt, (completedAt) => completedAt.getTime()),
      alarmDueAt: handle.alarmDueAt,
      metrics: {
        wallTime: 0,
        inputCount: inputCounts.get(handle.pid) ?? 0,
        outputCount: events.get(handle.pid)?.length ?? 0,
      },
    });

    const handleFor = (pid: Process.ID): Effect.Effect<ProcessManager.Handle.Any> => {
      const handle = handles.get(pid);
      return handle ? Effect.succeed(handle) : Effect.die(`no such process on host: ${pid}`);
    };

    /**
     * Replays the first delivery's outcome for a key already applied, so the caller cannot tell a
     * redelivery from the original.
     */
    const deduplicated = <A>(
      idempotencyKey: string | undefined,
      onRepeat: (recorded: Process.ID | null) => Effect.Effect<A>,
      apply: (record: (pid: Process.ID | null) => void) => Effect.Effect<A>,
    ): Effect.Effect<A> => {
      if (idempotencyKey !== undefined && seen.has(idempotencyKey)) {
        duplicates++;
        return onRepeat(seen.get(idempotencyKey) ?? null);
      }
      return apply((pid) => {
        if (idempotencyKey !== undefined) {
          seen.set(idempotencyKey, pid);
        }
      });
    };

    return {
      applied: Effect.sync(() => [...applied]),
      duplicates: Effect.sync(() => duplicates),

      spawn: (request) =>
        deduplicated(
          request.idempotencyKey,
          (pid) => (pid === null ? Effect.die('spawn replay lost its pid') : handleFor(pid).pipe(Effect.map(snapshot))),
          (record) =>
            Effect.gen(function* () {
              const definition = definitionFor(request.key);
              if (!definition) {
                return yield* Effect.die(`host does not host process '${request.key}'`);
              }
              const handle = yield* options.manager.spawn(definition, {
                ...(request.name !== undefined ? { name: request.name } : {}),
                ...(request.parentPid !== undefined ? { parentProcessId: request.parentPid } : {}),
                environment: { space: request.spaceId, ...request.environment },
                ...(request.annotations !== undefined ? { annotations: request.annotations } : {}),
              });
              handles.set(handle.pid, handle);
              const ring: RemoteProcessManager.Event[] = [];
              events.set(handle.pid, ring);
              // Detached: the collector outlives the spawn call, as the host's own event log does.
              yield* Effect.forkDetach(
                Stream.runForEach(handle.subscribeOutputs(), (data) =>
                  Effect.sync(() => {
                    ring.push({ _tag: 'output', seq: ring.length, data });
                  }),
                ).pipe(Effect.ignore),
              );
              record(handle.pid);
              return snapshot(handle);
            }),
        ),

      list: (request) =>
        Effect.sync(() =>
          [...handles.values()]
            .map(snapshot)
            .filter(
              (info) =>
                info.environment.space === request.spaceId &&
                (request.key === undefined || info.key === request.key) &&
                (request.state === undefined || info.state === request.state),
            ),
        ),

      status: ({ pid }) => handleFor(pid).pipe(Effect.map(snapshot)),

      submitInput: ({ pid, input, idempotencyKey }) =>
        deduplicated(
          idempotencyKey,
          () => Effect.void,
          (record) =>
            Effect.gen(function* () {
              const handle = yield* handleFor(pid);
              const definition = definitionFor(handle.key);
              if (!definition) {
                return yield* Effect.die(`host does not host process '${handle.key}'`);
              }
              // The wire carries an input encoded by the definition's input schema; the local
              // manager takes the decoded value.
              const decoded = yield* Schema.decodeUnknownEffect(definition.input)(input).pipe(Effect.orDie);
              record(null);
              inputCounts.set(pid, (inputCounts.get(pid) ?? 0) + 1);
              applied.push({ pid, input: decoded });
              yield* handle.submitInput(decoded);
            }),
        ),

      terminate: ({ pid, idempotencyKey }) =>
        deduplicated(
          idempotencyKey,
          () => Effect.void,
          (record) =>
            handleFor(pid).pipe(
              Effect.flatMap((handle) => handle.terminate()),
              Effect.tap(() => Effect.sync(() => record(null))),
            ),
        ),

      readEvents: ({ pid, cursor }) =>
        handleFor(pid).pipe(
          Effect.map((handle) => {
            const ring = events.get(pid) ?? [];
            return {
              events: ring.slice(cursor),
              cursor: ring.length,
              truncated: false,
              snapshot: snapshot(handle),
            };
          }),
        ),

      makeRpcClient: <Rpcs extends Rpc.Any>(): Effect.Effect<never> =>
        Effect.die('the local host stand-in serves no process RPC'),
    } as Host;
  });

/** Test handle on the command channel between client and host. */
export interface Link {
  /** Drops every call made over the channel, as an unreachable host does. */
  readonly cut: Effect.Effect<void>;
  /** Lets calls through again. Does NOT itself retry — that is `Queued.connected`'s job. */
  readonly resume: Effect.Effect<void>;
  readonly isUp: Effect.Effect<boolean>;
  /** Calls the channel refused while cut. */
  readonly refusals: Effect.Effect<number>;
  /**
   * Delivers calls to the host but fails the caller afterwards, modelling a lost acknowledgement —
   * the case where retrying is only safe because the command carries an idempotency key.
   */
  readonly dropAcks: (drop: boolean) => Effect.Effect<void>;
}

class ChannelDown extends Error {
  constructor() {
    super('remote host unreachable');
  }
}

/**
 * Wraps a {@link RemoteProcessManager.Control} in a channel a test can cut.
 *
 * Failures surface as DEFECTS, matching the real transport (`EdgeProcessControl` pipes every verb
 * through `Effect.orDie`) — so a client that does not handle them crashes rather than quietly
 * treating an unreachable host as an empty one.
 */
export const cuttable = (
  control: RemoteProcessManager.Control,
): { control: RemoteProcessManager.Control; link: Link } => {
  let up = true;
  let dropAcks = false;
  let refusals = 0;

  const guard = <A>(effect: Effect.Effect<A>): Effect.Effect<A> =>
    Effect.suspend(() => {
      if (!up) {
        refusals++;
        return Effect.die(new ChannelDown());
      }
      return dropAcks ? effect.pipe(Effect.andThen(Effect.die(new ChannelDown()))) : effect;
    });

  return {
    control: {
      spawn: (request) => guard(control.spawn(request)),
      list: (request) => guard(control.list(request)),
      status: (target) => guard(control.status(target)),
      submitInput: (target) => guard(control.submitInput(target)),
      terminate: (target) => guard(control.terminate(target)),
      readEvents: (target) => guard(control.readEvents(target)),
      makeRpcClient: (target) => control.makeRpcClient(target),
    },
    link: {
      cut: Effect.sync(() => {
        up = false;
      }),
      resume: Effect.sync(() => {
        up = true;
      }),
      isUp: Effect.sync(() => up),
      refusals: Effect.sync(() => refusals),
      dropAcks: (drop: boolean) =>
        Effect.sync(() => {
          dropAcks = drop;
        }),
    },
  };
};
