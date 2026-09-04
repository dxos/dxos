//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import type * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import type * as ProcessManager from './ProcessManager';
import { toError, toStatus } from './remote-process-info';
import type * as RemoteProcessManager from './RemoteProcessManager';

/** How long to wait before re-reading a process's event log after an empty page. */
const DEFAULT_POLL_INTERVAL = Duration.millis(250);

export interface Options<_Input, _Output, _Rpcs extends Rpc.Any> {
  /** Snapshot the handle starts from — from a spawn, list or status response. */
  readonly info: RemoteProcessManager.Snapshot;

  readonly control: RemoteProcessManager.Control;

  /**
   * Space every {@link RemoteProcessManager.Control} call is addressed within. Supplied rather than
   * read off {@link info}, whose `environment.space` is optional — a handle must be able to address
   * its process regardless of what the host chose to record.
   */
  readonly spaceId: SpaceId;

  /**
   * Local definition of the remote process, when the caller has it. Supplies the input/output
   * codecs (so values cross the wire encoded by the process's own schema) and the RPC group. Absent
   * for handles produced by `list`, which are metadata views: their inputs, outputs and RPC surface
   * throw until the caller re-attaches with a definition.
   */
  readonly definition?: Process.Process<_Input, _Output, any, _Rpcs>;

  readonly registry: Registry.AtomRegistry;

  readonly pollInterval?: Duration.Duration;

  /**
   * Ran after a lifecycle change this handle causes, so the manager's process tree — which the
   * aggregate `Process.Monitor` reads rather than recomputes — does not keep reporting a process
   * this handle has terminated.
   */
  readonly onLifecycleChange?: Effect.Effect<void>;
}

const TERMINAL_STATES: readonly Process.State[] = [
  Process.State.SUCCEEDED,
  Process.State.FAILED,
  Process.State.TERMINATED,
];

const isTerminal = (state: Process.State): boolean => TERMINAL_STATES.includes(state);

/**
 * {@link ProcessManager.Handle} for a process hosted by a remote runtime.
 *
 * The remote host owns the process; this is a view plus the control verbs. Outputs and ephemeral
 * trace are read by cursor (see `RemoteProcessManager.Control.readEvents`), so every subscription
 * runs its own independent paginated read — the endpoint is stateless in the cursor, so concurrent
 * readers do not consume each other's events and no fan-out hub is needed.
 *
 * `runToCompletion` / `runUntilSettled` are derived here from polled state rather than served by the
 * host, so the settle predicates cannot drift from `ProcessHandle`'s definitions.
 */
export class RemoteProcessHandle<_Input, _Output, _Rpcs extends Rpc.Any> implements ProcessManager.Handle<
  _Input,
  _Output,
  _Rpcs
> {
  readonly #control: RemoteProcessManager.Control;
  readonly #definition: Process.Process<_Input, _Output, any, _Rpcs> | undefined;
  readonly #registry: Registry.AtomRegistry;
  readonly #pollInterval: Duration.Duration;
  readonly #onLifecycleChange: Effect.Effect<void>;
  readonly #statusAtom: Atom.Writable<ProcessManager.Status>;
  #info: RemoteProcessManager.Snapshot;
  #rpc: RpcClient.RpcClient<_Rpcs> | undefined;

  /**
   * Effectful for symmetry with the local handle's construction, though nothing here can fail any
   * more: `Control` answers in domain types, so the transport has already decoded what arrived.
   */
  static make<I, O, R extends Rpc.Any>(options: Options<I, O, R>): Effect.Effect<RemoteProcessHandle<I, O, R>> {
    return Effect.sync(() => new RemoteProcessHandle(options));
  }

  readonly #options: Options<_Input, _Output, _Rpcs>;

  private constructor(options: Options<_Input, _Output, _Rpcs>) {
    this.#options = options;
    this.#control = options.control;
    this.#definition = options.definition;
    this.#registry = options.registry;
    this.#pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
    this.#onLifecycleChange = options.onLifecycleChange ?? Effect.void;
    this.#info = options.info;
    this.#statusAtom = Atom.make(toStatus(options.info));
    this.#registry.mount(this.#statusAtom);
  }

  /** Addresses this process for every {@link RemoteProcessManager.Control} call. */
  get #target(): RemoteProcessManager.ProcessTarget {
    return { spaceId: this.#options.spaceId, pid: this.pid };
  }

  get pid(): Process.ID {
    return this.#info.pid;
  }

  get parentId(): Process.ID | null {
    return this.#info.parentPid;
  }

  get key(): string {
    return this.#info.key;
  }

  get params(): Process.Params {
    return this.#info.params;
  }

  get environment(): Process.Environment {
    return this.#info.environment;
  }

  get alarmDueAt(): number | null {
    return this.#info.alarmDueAt;
  }

  get status(): ProcessManager.Status {
    return this.#registry.get(this.#statusAtom);
  }

  get statusAtom(): Atom.Atom<ProcessManager.Status> {
    return this.#statusAtom;
  }

  /**
   * The process's RPC client. Built lazily and cached, since it holds a transport the caller may
   * never use. Requires the local definition (for the RPC group) — a handle from `list` has none.
   */
  get rpc(): RpcClient.RpcClient<_Rpcs> {
    if (!this.#rpc) {
      // The client outlives any one call, so it is built in a scope that is deliberately never
      // closed — the same shape `ProcessManager` uses for its loopback clients.
      this.#rpc = Effect.runSync(
        this.#control
          .makeRpcClient<_Rpcs>({ ...this.#target, group: this.#requireDefinition().rpcs })
          .pipe(Effect.provideService(Scope.Scope, Effect.runSync(Scope.make()))),
      );
    }
    return this.#rpc;
  }

  submitInput(input: _Input): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const encoded = yield* Schema.encodeEffect(this.#requireDefinition().input)(input).pipe(Effect.orDie);
      yield* this.#control.submitInput({ ...this.#target, input: encoded });
    });
  }

  subscribeOutputs(): Stream.Stream<_Output> {
    // Decoding an output needs the definition's output codec, so a handle from `list` (which has no
    // definition) cannot serve this — the same limitation as {@link rpc}.
    const decode = Schema.decodeUnknownSync(this.#requireDefinition().output);
    // From the live end, not the start of the log: the local handle streams outputs as they are
    // produced, so replaying earlier turns' outputs into a new subscriber would not match it.
    return this.#readEventsFromEnd().pipe(
      Stream.filter((event) => event._tag === 'output'),
      Stream.map((event) => decode(event.data)),
    );
  }

  subscribeEphemeral(): Stream.Stream<Trace.Message> {
    // From the start of the log, matching the local handle: it replays buffered ephemeral events
    // before streaming new ones, which is what lets a UI attach mid-turn and still render it.
    return this.#readEvents(0).pipe(
      Stream.filter((event) => event._tag === 'trace'),
      Stream.map((event) => event.message),
    );
  }

  terminate(): Effect.Effect<void> {
    return this.#control
      .terminate(this.#target)
      .pipe(Effect.andThen(this.#refresh), Effect.andThen(this.#onLifecycleChange), Effect.asVoid);
  }

  runToCompletion(): Effect.Effect<void> {
    // Mirrors `ProcessHandle.runToCompletion`: settles on IDLE or a terminal state, and keeps waiting
    // through HYBERNATING (an alarm or a live child is still outstanding).
    return this.#awaitState((state) => state === Process.State.IDLE || isTerminal(state));
  }

  runUntilSettled(): Effect.Effect<void> {
    // Mirrors `ProcessHandle.runUntilSettled`: returns as soon as the foreground turn is done, so a
    // supervisor's reply does not wait on the sub-agents it delegated to. Hybernation with no
    // pending alarm means only background children remain, which is why the wire info carries
    // `alarmPending` — without it the two predicates could not be told apart remotely.
    return this.#awaitState(
      (state, info) =>
        state === Process.State.IDLE ||
        isTerminal(state) ||
        (state === Process.State.HYBERNATING && info.alarmDueAt === null),
    );
  }

  runAndExit(options: { readonly inputs: readonly _Input[] }): Stream.Stream<_Output> {
    const decode = Schema.decodeUnknownSync(this.#requireDefinition().output);
    return Stream.unwrap(
      Effect.gen({ self: this }, function* () {
        // The cursor is taken before the inputs are submitted, so the stream carries this call's
        // outputs and not the history of earlier turns.
        const start = yield* this.#endCursor;
        yield* Effect.forEach(options.inputs, (input) => this.submitInput(input), { discard: true });
        // Ends on IDLE or SUCCEEDED as the local `runAndExit` does — a remote process that goes idle
        // has finished this call's work, and waiting for a terminal state would never return.
        return this.#readEvents(start, (state) => state === Process.State.IDLE || isTerminal(state), true).pipe(
          Stream.filter((event) => event._tag === 'output'),
          Stream.map((event) => decode(event.data)),
        );
      }),
    );
  }

  hydrate(
    definition: Process.Process<_Input, _Output, any, _Rpcs>,
  ): Effect.Effect<ProcessManager.Handle<_Input, _Output, _Rpcs>> {
    // The host revives its own processes from its own storage, so there is no dormant state to
    // restore here. What a caller does need is the definition: a handle from `attach` or `list` has
    // no codecs, and this is the only place it can acquire them.
    return this.#refresh.pipe(
      Effect.andThen(() =>
        RemoteProcessHandle.make<_Input, _Output, _Rpcs>({ ...this.#options, info: this.#info, definition }),
      ),
    );
  }

  #requireDefinition(): Process.Process<_Input, _Output, any, _Rpcs> {
    if (!this.#definition) {
      throw new TypeError(
        `Remote process handle for '${this.key}' has no local process definition; inputs, outputs and RPC are unavailable`,
      );
    }
    return this.#definition;
  }

  /** Cursor just past the last event the host holds, for a subscription that wants only new events. */
  get #endCursor(): Effect.Effect<number> {
    // A read at or beyond the end returns an empty page carrying the current end cursor.
    return this.#control
      .readEvents({ ...this.#target, cursor: Number.MAX_SAFE_INTEGER })
      .pipe(Effect.map((page) => page.cursor));
  }

  #readEventsFromEnd(): Stream.Stream<RemoteProcessManager.Event> {
    return Stream.unwrap(this.#endCursor.pipe(Effect.map((cursor) => this.#readEvents(cursor))));
  }

  /**
   * Reads the process's event log from `start`, ending once `isDone` holds for the process's state
   * and the log is drained. Defaults to ending only on a terminal state, so a live IDLE process keeps
   * its subscription open.
   */
  #readEvents(
    start: number,
    isDone: (state: Process.State) => boolean = isTerminal,
    /** Fails the stream on FAILED or TERMINATED, which `runAndExit`'s contract requires. */
    failOnAbnormalExit = false,
  ): Stream.Stream<RemoteProcessManager.Event> {
    return Stream.paginate(start, (cursor: number) =>
      Effect.gen({ self: this }, function* () {
        const page = yield* this.#control.readEvents({ ...this.#target, cursor });
        yield* this.#setInfo(page.snapshot);
        if (page.truncated) {
          // The host dropped events before `cursor` from its bounded ring, so this page does not
          // continue the previous one — the consumer's history has a hole in it.
          log.warn('remote process event history truncated', { pid: page.snapshot.pid, cursor });
        }
        if (page.events.length === 0) {
          const state = page.snapshot.state;
          if (isDone(state)) {
            if (failOnAbnormalExit && state === Process.State.FAILED) {
              return yield* Effect.die(toError(page.snapshot.error));
            }
            if (failOnAbnormalExit && state === Process.State.TERMINATED) {
              return yield* Effect.die(new Error(`Process '${this.pid}' was terminated`));
            }
            return [[], Option.none<number>()] as const;
          }
          yield* Effect.sleep(this.#pollInterval);
        }
        return [page.events, Option.some(page.cursor)] as const;
      }),
    );
  }

  #awaitState(
    predicate: (state: Process.State, snapshot: RemoteProcessManager.Snapshot) => boolean,
  ): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      while (true) {
        const info = yield* this.#control.status(this.#target);
        yield* this.#setInfo(info);
        const state = info.state;
        if (state === Process.State.FAILED) {
          return yield* Effect.die(toError(info.error));
        }
        if (predicate(state, info)) {
          return;
        }
        yield* Effect.sleep(this.#pollInterval);
      }
    });
  }

  get #refresh(): Effect.Effect<void> {
    return this.#control.status(this.#target).pipe(Effect.flatMap((info) => this.#setInfo(info)));
  }

  #setInfo(info: RemoteProcessManager.Snapshot): Effect.Effect<void> {
    return Effect.sync(() => {
      this.#info = info;
      this.#registry.update(this.#statusAtom, () => toStatus(info));
    });
  }
}
