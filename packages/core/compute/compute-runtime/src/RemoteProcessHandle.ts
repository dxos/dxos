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
import type { ProcessProtocol } from '@dxos/protocols';

import type * as ProcessManager from './ProcessManager';
import { toEnvironment, toError, toParams, toProcessId, toState, toStatus } from './remote-process-info';
import type * as RemoteProcessManager from './RemoteProcessManager';

/** How long to wait before re-reading a process's event log after an empty page. */
const DEFAULT_POLL_INTERVAL = Duration.millis(250);

export interface Options<_Input, _Output, _Rpcs extends Rpc.Any> {
  /** Snapshot the handle starts from — from a spawn, list or status response. */
  readonly info: ProcessProtocol.ProcessInfo;

  readonly control: RemoteProcessManager.Control;

  /**
   * Local definition of the remote process, when the caller has it. Supplies the input/output
   * codecs (so values cross the wire encoded by the process's own schema) and the RPC group. Absent
   * for handles produced by `list`, which are metadata views: their inputs, outputs and RPC surface
   * throw until the caller re-attaches with a definition.
   */
  readonly definition?: Process.Process<_Input, _Output, any, _Rpcs>;

  readonly registry: Registry.AtomRegistry;

  readonly pollInterval?: Duration.Duration;
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
  readonly #statusAtom: Atom.Writable<ProcessManager.Status>;
  #info: ProcessProtocol.ProcessInfo;
  #rpc: RpcClient.RpcClient<_Rpcs> | undefined;

  constructor(options: Options<_Input, _Output, _Rpcs>) {
    this.#control = options.control;
    this.#definition = options.definition;
    this.#registry = options.registry;
    this.#pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
    this.#info = options.info;
    this.#statusAtom = Atom.make(toStatus(options.info));
    this.#registry.mount(this.#statusAtom);
  }

  get pid(): Process.ID {
    return toProcessId(this.#info.pid);
  }

  get parentId(): Process.ID | null {
    return this.#info.parentPid === null ? null : toProcessId(this.#info.parentPid);
  }

  get key(): string {
    return this.#info.key;
  }

  get params(): Process.Params {
    return toParams(this.#info.params);
  }

  get environment(): Process.Environment {
    return toEnvironment(this.#info.environment);
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
          .makeRpcClient<_Rpcs>(this.pid, this.#requireDefinition().rpcs)
          .pipe(Effect.provideService(Scope.Scope, Effect.runSync(Scope.make()))),
      );
    }
    return this.#rpc;
  }

  submitInput(input: _Input): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const encoded = yield* Schema.encodeEffect(this.#requireDefinition().input)(input).pipe(Effect.orDie);
      yield* this.#control.submitInput(this.pid, encoded);
    });
  }

  subscribeOutputs(): Stream.Stream<_Output> {
    // Decoding an output needs the definition's output codec, so a handle from `list` (which has no
    // definition) cannot serve this — the same limitation as {@link rpc}.
    const decode = Schema.decodeUnknownSync(this.#requireDefinition().output);
    return this.#readEvents().pipe(
      Stream.filter((event) => event._tag === 'output'),
      Stream.map((event) => decode(event.data)),
    );
  }

  subscribeEphemeral(): Stream.Stream<Trace.Message> {
    return this.#readEvents().pipe(
      Stream.filter((event) => event._tag === 'trace'),
      Stream.map((event) => decodeTraceMessage(event.message)),
    );
  }

  terminate(): Effect.Effect<void> {
    return this.#control.terminate(this.pid).pipe(Effect.andThen(this.#refresh), Effect.asVoid);
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
        (state === Process.State.HYBERNATING && !info.alarmPending),
    );
  }

  runAndExit(options: { readonly inputs: readonly _Input[] }): Stream.Stream<_Output> {
    return Stream.unwrap(
      Effect.gen({ self: this }, function* () {
        const outputs = this.subscribeOutputs();
        yield* Effect.forEach(options.inputs, (input) => this.submitInput(input), { discard: true });
        return outputs;
      }),
    );
  }

  hydrate(): Effect.Effect<ProcessManager.Handle<_Input, _Output, _Rpcs>> {
    // The remote host hydrates its own processes from its own storage; a client handle has no
    // dormant state to revive, so this is a refresh.
    return this.#refresh.pipe(Effect.as(this));
  }

  #requireDefinition(): Process.Process<_Input, _Output, any, _Rpcs> {
    if (!this.#definition) {
      throw new TypeError(
        `Remote process handle for '${this.key}' has no local process definition; inputs, outputs and RPC are unavailable`,
      );
    }
    return this.#definition;
  }

  /** Reads the process's event log from the beginning, ending once the process is terminal and drained. */
  #readEvents(): Stream.Stream<ProcessProtocol.ProcessEvent> {
    return Stream.paginate(0, (cursor: number) =>
      Effect.gen({ self: this }, function* () {
        const page = yield* this.#control.readEvents(this.pid, cursor);
        this.#setInfo(page.info);
        if (page.events.length === 0) {
          if (isTerminal(toState(page.info.state))) {
            return [[], Option.none<number>()] as const;
          }
          yield* Effect.sleep(this.#pollInterval);
        }
        return [page.events, Option.some(page.cursor)] as const;
      }),
    );
  }

  #awaitState(predicate: (state: Process.State, info: ProcessProtocol.ProcessInfo) => boolean): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      while (true) {
        const info = yield* this.#control.status(this.pid);
        this.#setInfo(info);
        const state = toState(info.state);
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
    return this.#control.status(this.pid).pipe(Effect.tap((info) => Effect.sync(() => this.#setInfo(info))));
  }

  #setInfo(info: ProcessProtocol.ProcessInfo): void {
    this.#info = info;
    this.#registry.update(this.#statusAtom, () => toStatus(info));
  }
}

/**
 * Rebuilds a {@link Trace.Message} from the JSON the host put on the wire. Routed through
 * `Trace.decodeTraceMessage` so there is one wire form for trace messages rather than a second one
 * for this transport.
 */
const decodeTraceMessage = (message: unknown): Trace.Message =>
  Trace.decodeTraceMessage(new TextEncoder().encode(JSON.stringify(message)));
