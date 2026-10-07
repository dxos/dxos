//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as Schema from 'effect/Schema';
import * as Semaphore from 'effect/Semaphore';
import * as Stream from 'effect/Stream';

import { Annotation, type Database } from '@dxos/echo';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { DXN, type SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import type { SerializedError } from '@dxos/protocols';

import { InvalidOperationInputError } from './errors.ts';
import * as Operation from './Operation.ts';
import * as OperationHandlerSet from './OperationHandlerSet.ts';
import * as StorageService from './StorageService.ts';
import * as Trace from './Trace.ts';

export { RUN_AGAIN_ERROR_CODE, RUN_AGAIN_MESSAGE, RunAgainError } from './errors.ts';

//
// Process.
//

/** Opaque process id (arbitrary string). */
export const ID = Schema.String.pipe(Schema.brand('ProcessId'));
export type ID = Schema.Schema.Type<typeof ID>;

/**
 * Generic parameters for a all processes.
 */
export interface Params {
  /**
   * Process name for debugging purposes.
   */
  readonly name: string | null;

  /**
   * User-defined annotations for the process.
   * Can only be set when the process is spawned.
   */
  readonly annotations: Annotation.Dictionary;
}

/**
 * What the process is running on behalf of, fixed at spawn and inherited by child processes.
 *
 * Determines which services the runtime can provide (a space-scoped database, a conversation's harness).
 */
export interface Environment {
  /** Space the process is scoped to; absent for app-level work. */
  readonly space?: SpaceId;

  /** URI of the conversation feed (queue) the process is serving; absent outside a conversation. */
  readonly conversation?: URI.URI;
}

/**
 * The environment the running process was spawned with, for a handler that hands its work to another
 * runtime (e.g. EDGE dispatching an operation to its operation worker), which must carry the conversation along.
 */
export class EnvironmentService extends Context.Service<EnvironmentService, Environment>()(
  '@dxos/compute/Process.EnvironmentService',
) {}

/** The running process's environment; empty outside a process, so a handler can read it wherever it runs. */
export const currentEnvironment: Effect.Effect<Environment> = Effect.serviceOption(EnvironmentService).pipe(
  Effect.map(Option.getOrElse((): Environment => ({}))),
);

/**
 * Attaches the process to a target object.
 */
export const TargetAnnotation = Annotation.make({
  id: 'org.dxos.process.target',
  schema: URI.Schema,
});

/**
 * Notification descriptor for surfacing process lifecycle events to the user.
 */
export const NotifyAnnotation = Annotation.make({
  id: 'org.dxos.process.notify',
  schema: Operation.NotifyOptions,
});

/**
 * Marks a process as the harness host for its conversation (discovery substrate).
 */
export const HarnessHostAnnotation = Annotation.make({
  id: 'org.dxos.process.harnessHost',
  schema: Schema.Boolean,
});

/** Whether `info` is a conversation's agent process (stamped {@link HarnessHostAnnotation} at spawn). */
export const isHarnessHost = (info: Pick<Process, 'params'>): boolean =>
  Option.getOrElse(Annotation.getDictionary(info.params.annotations, HarnessHostAnnotation), () => false);

/**
 * Runtime state of a process.
 */
export enum State {
  // Command to spawn the process has been accepted locally but the runtime hosting it has not yet
  // acknowledged it. Only ever reported by a client queueing commands for a remote runtime
  // (`RemoteCommandQueue`); a process the local runtime owns is never in this state.
  STARTING = 'STARTING',

  // Process is actively running.
  RUNNING = 'RUNNING',

  // Process is waiting for a child process to complete or an alarm to trigger.
  HYBERNATING = 'HYBERNATING',

  // Process is waiting for input. It will only resume when input is submitted.
  IDLE = 'IDLE',

  // Process is terminating and will transition to TERMINATED state.
  // TODO(dmaretskyi): Consider removing.
  TERMINATING = 'TERMINATING',

  // Process has been externally terminated.
  TERMINATED = 'TERMINATED',

  // Process has completed successfully.
  SUCCEEDED = 'SUCCEEDED',

  // Process has failed.
  FAILED = 'FAILED',
}

/**
 * Whether a process in `state` has exited: SUCCEEDED, FAILED or TERMINATED. A runtime never moves a
 * process out of these states, which is what makes them final for a host.
 */
export const isExited = (state: State): boolean =>
  state === State.SUCCEEDED || state === State.FAILED || state === State.TERMINATED;

/**
 * Whether a process in `state` will never run another turn: {@link isExited}, or TERMINATING.
 * TERMINATING counts because the handle is already finished, so a caller adopting it would submit
 * input that is dropped and wait on a process that will never run again.
 */
export const isTerminal = (state: State): boolean => isExited(state) || state === State.TERMINATING;

/** Filters for {@link Manager.list}; an absent field matches everything. */
export interface Filter {
  readonly key?: string;
  /** Target object the process was spawned against ({@link TargetAnnotation}). */
  readonly target?: URI.URI;
  readonly state?: State;
  /** Space from the process's {@link Environment}; a process with no space matches no space filter. */
  readonly space?: SpaceId;
  readonly parentPid?: ID | null;
}

/**
 * Whether `info` satisfies `filter`. Exported so every {@link Manager} filters identically rather
 * than each implementation growing its own notion of a match.
 */
export const matchesFilter = (info: Process, filter: Filter = {}): boolean => {
  if (filter.key !== undefined && info.key !== filter.key) {
    return false;
  }
  if (filter.state !== undefined && info.state !== filter.state) {
    return false;
  }
  if (filter.space !== undefined && info.environment.space !== filter.space) {
    return false;
  }
  if (filter.parentPid !== undefined && info.parentPid !== filter.parentPid) {
    return false;
  }
  if (
    filter.target !== undefined &&
    Option.getOrUndefined(Annotation.getDictionary(info.params.annotations, TargetAnnotation)) !== filter.target
  ) {
    return false;
  }
  return true;
};

/** {@link Manager.list} over a tree read, so a manager implements it by supplying only that read. */
export const listFromTree =
  (processTree: Effect.Effect<readonly Process[]>) =>
  (filter?: Filter): Effect.Effect<readonly Process[]> =>
    Effect.map(processTree, (tree) => tree.filter((info) => matchesFilter(info, filter)));

/**
 * The plain fields of a {@link Process}: what a process tree holds, what crosses the wire, and what
 * {@link make} turns back into a process.
 */
export interface Data {
  readonly pid: ID;
  readonly parentPid: ID | null;

  /**
   * Key of the process.
   *
   * NOTE: There might be multiple running processes with the same key.
   */
  readonly key: string;

  /**
   * Parameters of the process.
   */
  readonly params: Params;

  /**
   * What the process is running on behalf of. See {@link Environment}.
   */
  readonly environment: Environment;

  /**
   * State of the process.
   */
  readonly state: State;

  /**
   * How the process failed as a serializable {@link SerializedError} (its `context` carries any
   * structured detail, e.g. a notify override), or `null` unless it is in FAILED state.
   */
  readonly error: SerializedError | null;

  /**
   * UNIX timestamp in milliseconds.
   */
  readonly startedAt: number;

  /**
   * UNIX timestamp in milliseconds.
   */
  readonly completedAt: Option.Option<number>;

  readonly metrics: {
    /**
     * Total wall time of all handler invocations of the process in milliseconds.
     */
    readonly wallTime: number;

    /**
     * Total number of inputs submitted to the process.
     */
    readonly inputCount: number;

    /**
     * Total number of outputs submitted to the process.
     */
    readonly outputCount: number;
  };
}

export interface Status {
  readonly state: State;
  readonly exit: Option.Option<Exit.Exit<void>>;

  readonly startedAt: Date;
  readonly completedAt: Option.Option<Date>;
}

/**
 * A process: one running (or finished) instance of a durable operation, wherever its runtime runs.
 *
 * Its {@link Data} fields are plain values; the rest are live members that talk to the runtime.
 * A process read from a tree or list is a cheap snapshot that reaches its runtime only once a
 * live member is used (see {@link make}).
 */
export interface Process<_Input = any, _Output = any, _Rpcs extends Rpc.Any = any> extends Data {
  submitInput(input: _Input): Effect.Effect<void>;
  subscribeOutputs(): Stream.Stream<_Output>;

  /**
   * Subscribe to ephemeral trace messages for this process.
   * Replays buffered events, then streams new ones as they arrive.
   * The stream completes when the process reaches a terminal state.
   *
   * When consuming this stream from a short-lived parent effect (e.g. React
   * `useEffect` that `runPromise(Effect.forEach(subscribe))` and returns), fork
   * the collector with {@link Effect.forkDetach}, not {@link Effect.forkChild} — the
   * parent scope closes as soon as `forEach` finishes and interrupts scoped forks
   * before live `pushEphemeral` events arrive. Interrupt the daemon fiber explicitly
   * on dispose.
   */
  subscribeEphemeral(): Stream.Stream<Trace.Message>;

  terminate(): Effect.Effect<void>;
  readonly status: Status;

  /**
   * Absolute due-time (epoch ms) of the process's pending alarm, or `null` when none is scheduled.
   * A host that suspends the process between turns (a Durable Object) mirrors this onto its own
   * scheduler, since the runtime's alarm is an in-memory timer.
   */
  readonly alarmDueAt: number | null;
  statusAtom: Atom.Atom<Status>;

  /**
   * Resolves when the process reaches {@link State.IDLE} (nothing in-flight; waiting for input),
   * or a terminal state ({@link State.SUCCEEDED}, {@link State.TERMINATED}, {@link State.FAILED}).
   *
   * Does not resolve while the process is {@link State.HYBERNATING} (e.g. alarm pending or non-terminal child).
   * The effect keeps waiting until that external work finishes and the process becomes idle or terminal.
   *
   * If the process fails, this effect throws a defect.
   */
  runToCompletion(): Effect.Effect<void>;

  /**
   * Resolves when the process settles its current foreground turn: {@link State.IDLE} or
   * {@link State.SUCCEEDED}, or {@link State.HYBERNATING} with no pending alarm
   * (i.e. only background children remain in flight).
   *
   * Unlike {@link runToCompletion}, this does NOT wait for background children (e.g. delegated
   * sub-agents) to finish — so a supervisor's chat turn returns as soon as its reply is complete,
   * while sub-agents continue running and report back out of band. Still waits through
   * alarm-pending hybernation (more queued turn work). Defects on {@link State.FAILED}.
   */
  runUntilSettled(): Effect.Effect<void>;

  /**
   * Submits each input in order, then streams outputs until the process reaches {@link State.IDLE}
   * or {@link State.SUCCEEDED}. While {@link State.HYBERNATING}, keeps waiting for outputs
   * or a terminal state. The stream fails with a defect if the process reaches {@link State.FAILED}
   * or {@link State.TERMINATED}.
   */
  runAndExit(options: { readonly inputs: readonly _Input[] }): Stream.Stream<_Output>;

  /**
   * Hydrates a dormant persisted process using the supplied definition.
   * No-op when the handle is already live (returns self).
   */
  hydrate(definition: Operation.Durable<_Input, _Output, any, any>): Effect.Effect<Process<_Input, _Output, _Rpcs>>;

  readonly rpc: RpcClient.RpcClient<_Rpcs>;
}

// `any` Rpcs keeps every process assignable regardless of its concrete RPC group (variance, see design spec §4.4).
export type Any = Process<any, any, any>;

/**
 * Options for spawning a process.
 */
export interface SpawnOptions {
  /**
   * Parent process ID — child inherits the parent's trace context.
   * Inside a process, its {@link ManagerService} defaults this to that process; pass `undefined`
   * explicitly to spawn a detached process.
   */
  readonly parentProcessId?: ID;

  /**
   * Process name for debugging purposes.
   */
  readonly name?: string;

  /**
   * Target object that this process is assigned to.
   * Ergonomic shorthand folded into {@link TargetAnnotation} on the process annotations.
   */
  // TODO(dmaretskyi): Consider opaques metadata instead of opinionated `target` field.
  readonly target?: URI.URI;

  /**
   * Tracing metadata for this invocation.
   */
  readonly traceMeta?: Trace.Meta;

  readonly environment?: Environment;

  /**
   * Who the process's database writes are attributed to (see `Database.Origin`); also the origin of every process it
   * invokes. Persisted with the process, so a restored process keeps it.
   */
  readonly origin?: Database.Origin;

  /**
   * User-facing notifications requested for this process's lifecycle phases.
   * Ergonomic shorthand folded into {@link NotifyAnnotation} on the process annotations.
   */
  readonly notify?: Operation.NotifyOptions;

  /**
   * User-defined annotations to attach to the process.
   * Caller-supplied entries are merged over the {@link target}/{@link notify} shorthands.
   */
  readonly annotations?: Annotation.Dictionary;
}

export interface ListOptions {
  /**
   * Filter processes by process definition key.
   */
  readonly key?: string;

  /**
   * Filter processes by parent process ID.
   */
  readonly parentProcessId?: ID;

  /**
   * Filter processes by state.
   */
  readonly state?: State;

  /**
   * Filter processes by target object ID.
   */
  readonly target?: URI.URI;
}

//
// Manager.
//

/** Where a process runs: this runtime, or the remote (EDGE) runtime hosting `space`. */
export type Location = { readonly kind: 'local' } | { readonly kind: 'edge'; readonly space: SpaceId };

export interface LocationOptions {
  /** Defaults to local. */
  readonly location?: Location;
}

/**
 * Every process this client can see or run, local and remote, behind one surface.
 *
 * The reads span both runtimes, so they answer "is my process running, wherever it runs" — which is
 * what a UI renders and what a caller holding no handle can ask. The control verbs take a
 * {@link Location}: a remote process is not a local one, so the caller still names where it runs,
 * but no longer has to hold both managers to do so.
 */
export interface Manager {
  /** Current state of the process tree. */
  readonly processTree: Effect.Effect<readonly Process[]>;

  /** Atom for the process tree. */
  readonly processTreeAtom: Atom.Atom<readonly Process[]>;

  /**
   * The process tree narrowed by {@link Filter}. A filter naming a space re-reads that space from
   * the remote runtime first, so it is the authoritative read where the atom is the cheap one.
   */
  list(filter?: Filter): Effect.Effect<readonly Process[]>;

  /**
   * Stream ephemeral trace messages matching `filter` (DX-1125), sourced from local in-process
   * runtimes and remote runtimes broadcasting over the space swarm. Used to drive live progress UI.
   */
  subscribeToTraceMessages(filter: Trace.Filter): Stream.Stream<Trace.Message>;

  /**
   * Spawn a process at `options.location`. A remote host is sent only the definition's key; the
   * definition stays local, supplying the codecs and RPC group the handle is typed by.
   *
   * Dies when the location is a remote runtime that offers no process control.
   */
  spawn<I, O, Rpcs extends Rpc.Any = never>(
    definition: Operation.Durable<I, O, any, Rpcs>,
    options?: SpawnOptions & LocationOptions,
  ): Effect.Effect<Process<I, O, Rpcs>>;

  /**
   * Live processes at `options.location` matching `options`. Dormant entries require
   * {@link Process.hydrate} before inputs can be submitted.
   *
   * Dies when the location is a remote runtime that offers no process control.
   */
  handles(options?: ListOptions & LocationOptions): Effect.Effect<readonly Any[]>;

  /**
   * The live process `pid` at `options.location`. A process that has already exited
   * replays its outputs, so its result stays readable after the exit.
   *
   * Dies when no such process is known, or when the location is a remote runtime that offers no
   * process control.
   */
  attach<I, O, Rpcs extends Rpc.Any = never>(pid: ID, options?: LocationOptions): Effect.Effect<Process<I, O, Rpcs>>;
}

/**
 * The first output of a single-output process (e.g. one running an operation), failing with the
 * process's own cause when it fails without one.
 */
export const awaitOutput = <O>(handle: Process<any, O, any>): Effect.Effect<O> =>
  handle.subscribeOutputs().pipe(
    Stream.runHead,
    Effect.flatMap(
      Option.match({
        onSome: Effect.succeed,
        onNone: () => {
          switch (handle.status.state) {
            case State.FAILED:
              return Effect.failCause(
                handle.status.exit.pipe(
                  Option.flatMap(Exit.getCause),
                  Option.getOrElse(() => Cause.die('Operation failed with unknown error')),
                ),
              );
            case State.TERMINATED:
              return Effect.die('Operation was terminated');
            case State.SUCCEEDED:
              return Effect.die('Process produced no output');
            default:
              // Outputs close on a live process only when its manager suspends it (app shutdown): the
              // wait was cut short rather than answered.
              return Effect.interrupt;
          }
        },
      }),
    ),
  );

export class ManagerService extends Context.Service<ManagerService, Manager>()(
  '@dxos/compute/Process.ManagerService',
) {}

//
// Operations as processes.
//

/**
 * Durable marker recording that an operation's input handler has begun executing.
 * Persisted before the handler runs so that, after an interruption (suspend/restart), a
 * re-delivered input can tell that the previous attempt was in-flight. Cleared automatically
 * when the process reaches a terminal state (the runtime clears the process's storage).
 */
const OperationStartedCell = StorageService.cell(Schema.fromJsonString(Schema.Boolean), 'operation/started').pipe(
  StorageService.withDefault(() => false),
);

/**
 * Runs a (non-durable) operation as a durable one: a single-input process that invokes the operation's handler.
 */
export const fromOperation = <const Op extends Operation.Definition.Any>(
  op: Op,
  handlers: OperationHandlerSet.OperationHandlerSet,
): Operation.Durable<
  Operation.Definition.Input<Op>,
  Operation.Definition.Output<Op>,
  Operation.Definition.Services<Op>
> => {
  const definition: Operation.DurableDefinition<
    Operation.Definition.Input<Op>,
    Operation.Definition.Output<Op>,
    Operation.Definition.Services<Op>
  > = Operation.makeDurable({
    key: DXN.getName(op.meta.key),
    input: op.input,
    output: op.output,
    services: op.services,
  });

  return Operation.withDurableHandler(definition, (ctx) =>
    Effect.gen(function* () {
      const semaphore = yield* Semaphore.make(1);
      // The process runtime assumes handlers are idempotent and always re-delivers an input
      // whose handler was interrupted. Non-idempotent operations opt out of that retry here:
      // a re-delivery that observes the durable "started" marker fails instead of repeating
      // side effects. Idempotent operations skip the marker and are simply re-run.
      const idempotent = Operation.isIdempotent(op);

      return {
        onInput: (input: Operation.Definition.Input<Op>) =>
          Effect.gen(function* () {
            if (!idempotent) {
              const started = yield* OperationStartedCell.get;
              if (started) {
                return yield* Effect.die(
                  new Error(`non-idempotent operation "${op.meta.key}" was interrupted; cannot retry safely`),
                );
              }
              yield* OperationStartedCell.set(true);
            }

            // Emit operation start event.
            log('operation process invoking', { key: op.meta.key, name: op.meta.name });
            yield* Trace.write(Trace.OperationStart, {
              key: op.meta.key,
              name: op.meta.name,
              icon: op.meta.icon,
            });
            // Emit ephemeral operation input event for live subscribers
            // (history tracker, devtools) without persisting raw input.
            yield* Trace.write(Trace.OperationInput, {
              key: op.meta.key,
              name: op.meta.name,
              input,
            });

            // A property the schema does not declare is a caller mistake, not a value to drop:
            // a misspelled field left `query-objects` with no `text` and no `typename`, which
            // its handler read as "match everything" and returned as a successful search. The
            // edge path validates the same way in `wrapFunctionHandler`; validating here too
            // keeps a local invocation and a remote one to one contract.
            yield* validateOperationInput(op, input);

            const opHandler = yield* OperationHandlerSet.getHandler(handlers, op).pipe(Effect.orDie);
            const output = yield* opHandler
              .handler(input)
              .pipe(Effect.orDie, Effect.withSpan(op.meta.key)) as Effect.Effect<
              Operation.Definition.Output<Op>,
              never,
              never
            >;

            ctx.submitOutput(output);
            ctx.succeed();

            // Emit ephemeral operation output event before the persisted
            // end event so subscribers see output + completion together.
            yield* Trace.write(Trace.OperationOutput, {
              key: op.meta.key,
              name: op.meta.name,
              output,
            });
            // Emit operation end event with success after side-effects complete.
            yield* Trace.write(Trace.OperationEnd, {
              key: op.meta.key,
              name: op.meta.name,
              icon: op.meta.icon,
              outcome: 'success',
            });
          }).pipe(
            Effect.catchDefect((defect) =>
              Effect.gen(function* () {
                // Emit operation end event with failure. Carry the error's stable name as `errorCode`
                // so consumers can match on the failure kind (e.g. a run-again yield) without parsing
                // the message.
                const errorMessage = defect instanceof Error ? defect.message : String(defect);
                const errorCode = defect instanceof Error ? defect.name : undefined;
                yield* Trace.write(Trace.OperationEnd, {
                  key: op.meta.key,
                  name: op.meta.name,
                  icon: op.meta.icon,
                  outcome: 'failure',
                  error: errorMessage,
                  ...(errorCode ? { errorCode } : {}),
                });
                return yield* Effect.die(defect);
              }),
            ),
            semaphore.withPermits(1),
          ),
      };
    }),
  );
};

/**
 * Reject an operation input the operation's own schema does not admit, naming the offending value.
 *
 * The excess-property check is deliberately top-level only: a misspelled field is the mistake worth
 * catching, and an in-process caller legitimately passes a LIVE ECHO object as a property value,
 * which carries internal keys no declared schema lists. `reportInput` and `errors: 'all'` put the
 * rejected value and every bad field in the message, since a remote caller cannot see its own
 * payload in our logs.
 */
const validateOperationInput = <const Op extends Operation.Definition.Any>(
  op: Op,
  input: unknown,
): Effect.Effect<void> => {
  // An input schema that describes no shape cannot say what an excess property would be, and a
  // caller handing a payload to an operation declaring `Void` is the trigger dispatcher's normal
  // contract. `Null` is in the set because a `Void` input comes back as `Null` once the operation
  // has round-tripped through its serialized schema, which is how the dispatcher rebuilds it.
  const typeAst = Schema.toType(op.input).ast;
  if (CONTENTLESS_INPUT_TAGS.has(typeAst._tag)) {
    return Effect.void;
  }

  const fail = (message: string, cause?: unknown) =>
    new InvalidOperationInputError({
      message: `Operation input did not match schema (${op.meta.key}): ${message}`,
      cause,
    });

  // Invoking with no arguments is how a skill template and the trigger dispatcher call an operation
  // whose fields are all optional, so a nullish payload is validated as the empty object it stands
  // for rather than rejected outright; a schema that does require fields still names them.
  const payload = input ?? (SchemaAST.isObjects(typeAst) ? {} : input);

  return Effect.suspend(() => {
    const undeclared = undeclaredTopLevelKeys(typeAst, payload);
    if (undeclared.length > 0) {
      return Effect.die(
        fail(`unexpected ${undeclared.length === 1 ? 'property' : 'properties'} ${undeclared.join(', ')}`),
      );
    }

    return Effect.try({
      try: () => Schema.decodeUnknownSync(Schema.toType(op.input), { reportInput: true, errors: 'all' })(payload),
      catch: (error: any) => fail(error?.message ?? String(error), error),
    }).pipe(Effect.asVoid, Effect.orDie);
  });
};

/** Own keys of a struct input that the schema does not declare; empty for any other input shape. */
const undeclaredTopLevelKeys = (typeAst: SchemaAST.AST, input: unknown): string[] => {
  if (!SchemaAST.isObjects(typeAst) || typeof input !== 'object' || input === null || Array.isArray(input)) {
    return [];
  }
  // An index signature makes every key declared, so there is nothing to reject.
  if (typeAst.indexSignatures.length > 0) {
    return [];
  }

  const declared = new Set(SchemaAST.getPropertySignatures(typeAst).map((prop) => prop.name.toString()));
  return Object.keys(input).filter((key) => !declared.has(key));
};

const CONTENTLESS_INPUT_TAGS: ReadonlySet<string> = new Set(['Any', 'Unknown', 'Void', 'Undefined', 'Null', 'Never']);

/**
 * Spawns `op` as a process through the ambient {@link ManagerService} and submits `input`; read its
 * result with {@link awaitOutput}.
 */
export const spawn = <I, O>(
  op: Operation.Definition<I, O>,
  input: I,
  options?: SpawnOptions & LocationOptions,
): Effect.Effect<Process<I, O, never>, never, ManagerService | OperationHandlerSet.OperationHandlerProvider> =>
  Effect.gen(function* () {
    const manager = yield* ManagerService;
    const handlers = yield* OperationHandlerSet.OperationHandlerProvider;
    const handle = yield* manager.spawn(fromOperation(op, handlers), {
      name: op.meta.name ? `${op.meta.name} (${op.meta.key})` : op.meta.key,
      ...options,
    });
    yield* handle.submitInput(input);
    return handle;
  });

/**
 * New process is spawned.
 */
export const SpawnedEvent = Trace.EventType('process.spawned', {
  schema: Schema.Void,
  isEphemeral: false,
});

/**
 * Process has reached a terminal state.
 */
export const ExitedEvent = Trace.EventType('process.exited', {
  schema: Schema.Struct({
    outcome: Schema.Literals(['succeeded', 'failed', 'terminated']),
  }),
  isEphemeral: false,
});

/**
 * Renders spawned processes as a forest: top-level rows use "- ", nested rows use ├── / └── / │.
 */
export const prettyProcessTree = (tree: readonly Process[]): string => {
  if (tree.length === 0) {
    return '';
  }

  const pidSet = new Set(tree.map((node) => node.pid));
  const childrenByParent = new Map<string, Process[]>();
  const roots: Process[] = [];

  for (const node of tree) {
    const parent = node.parentPid;
    if (parent === null || !pidSet.has(parent)) {
      roots.push(node);
      continue;
    }
    const key = String(parent);
    const siblings = childrenByParent.get(key) ?? [];
    siblings.push(node);
    childrenByParent.set(key, siblings);
  }

  const byPid = (a: Process, b: Process) => String(a.pid).localeCompare(String(b.pid));
  roots.sort(byPid);
  for (const siblings of childrenByParent.values()) {
    siblings.sort(byPid);
  }

  const formatLabel = (node: Process): string => {
    const idShort = String(node.pid).slice(0, 6);
    const parts = [idShort, node.state];
    if (node.params.name != null && node.params.name !== '') {
      parts.push(node.params.name);
    }
    if (node.error != null) {
      parts.push(`(${node.error.message ?? node.error.name ?? 'error'})`);
    }
    const { inputCount, outputCount, wallTime } = node.metrics;
    parts.push(`[in:${inputCount} out:${outputCount} wall:${Math.round(wallTime)}ms]`);
    return parts.join(' ');
  };

  const lines: string[] = [];

  const walk = (node: Process, prefix: string, isLast: boolean, isRoot: boolean): void => {
    if (isRoot) {
      lines.push(`- ${formatLabel(node)}`);
    } else {
      const branch = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${branch}${formatLabel(node)}`);
    }

    const children = childrenByParent.get(String(node.pid)) ?? [];
    const nextPrefix = isRoot ? '  ' : `${prefix}${isLast ? '    ' : '│   '}`;
    children.forEach((child, index) => {
      walk(child, nextPrefix, index === children.length - 1, false);
    });
  };

  for (const root of roots) {
    walk(root, '', true, true);
  }

  return lines.join('\n');
};
