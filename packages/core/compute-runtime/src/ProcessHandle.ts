//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, type Registry } from '@effect-atom/atom';
import * as Cause from 'effect/Cause';
import type * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { Process, type Trace } from '@dxos/compute';
import type * as StorageService from '@dxos/compute/StorageService';
import { Performance } from '@dxos/effect';
import { log } from '@dxos/log';

import type { PersistedEvent, PersistedEventInput } from './process-store';
import type * as ProcessManager from './ProcessManager';
import { EphemeralTraceBuffer } from './trace-buffer';

/**
 * Output queue uses Option to signal completion: Some(value) for data, None for end-of-stream.
 */
export type OutputItem<O> = Option.Option<O>;

/**
 * Durable persistence hooks supplied by the manager. All are no-ops for
 * ephemeral (non-durable) managers.
 */
export interface Persistence {
  /** Persist the absolute alarm due-time (epoch ms), or null to clear it. */
  setAlarm(dueAt: number | null): Effect.Effect<void>;
  /** Persist the latest computed lifecycle state. */
  setState(state: Process.State): Effect.Effect<void>;
  /** Remove a settled event from the durable mailbox. */
  removeEvent(seq: number): Effect.Effect<void>;
  /** Append an event to the durable mailbox; resolves with its assigned seq. */
  appendEvent(event: PersistedEventInput): Effect.Effect<number>;
  /** Delete the durable record entirely (terminal state / explicit terminate). */
  deleteRecord(): Effect.Effect<void>;
}

const NOOP_PERSISTENCE: Persistence = {
  setAlarm: () => Effect.void,
  setState: () => Effect.void,
  removeEvent: () => Effect.void,
  appendEvent: () => Effect.succeed(0),
  deleteRecord: () => Effect.void,
};

const toPersistedChildEvent = (event: Process.ChildEvent<unknown>) =>
  event._tag === 'output'
    ? { pid: event.pid, exited: false, data: event.data }
    : {
        pid: event.pid,
        exited: true,
        success: Exit.isSuccess(event.result),
        error: Exit.isFailure(event.result) ? Cause.pretty(event.result.cause) : undefined,
      };

const fromPersistedChildEvent = (event: {
  pid: Process.ID;
  exited: boolean;
  success?: boolean;
  error?: string;
  data?: unknown;
}): Process.ChildEvent<unknown> => {
  if (!event.exited) {
    return { _tag: 'output', pid: event.pid, data: event.data };
  }
  return {
    _tag: 'exited',
    pid: event.pid,
    result: event.success ? Exit.void : Exit.die(event.error ?? 'unknown'),
  };
};

/**
 * Concrete implementation of {@link Handle}.
 *
 * Owns the process scope, output queue, status atom, alarm timer, and
 * ephemeral trace buffer/subscribers for a single spawned process. The
 * manager drives lifecycle by invoking `runOnSpawn()` after construction,
 * `submitInput()`/`requestSubmitOutput()` during operation, and `terminate()`
 * on shutdown. ProcessManager.Status transitions are computed here from handler accounting
 * (`#activeHandlers`, `#succeedRequested`, `#failError`, alarm/children).
 */
export class ProcessHandleImpl<I, O, R> implements ProcessManager.Handle<I, O> {
  readonly statusAtom: Atom.Writable<ProcessManager.Status>;
  readonly parentId: Process.ID | null;
  readonly environment: ProcessManager.Environment;

  #currentStatus: ProcessManager.Status;
  #activeHandlers = 0;
  #finished = false;
  #succeedRequested = false;
  #failError: Error | null = null;
  readonly key: string;
  readonly params: Process.Params;
  #wallTimeMs = 0;
  #inputCount = 0;
  #outputCount = 0;
  #alarmTimer: ReturnType<typeof setTimeout> | null = null;
  #alarmDueAt: number | null = null;
  #services: Context.Context<R | Process.BaseServices>;
  #alarmSemaphore = Effect.runSync(Effect.makeSemaphore(1));

  readonly #callbacks: Process.Callbacks<I, O, R>;
  readonly #scope: Scope.CloseableScope;
  readonly #registry: Registry.Registry;
  readonly #outputQueue: Queue.Queue<OutputItem<O>>;
  readonly #storage: StorageService.Service;
  readonly #traceSink: Trace.Sink;
  readonly #persistence: Persistence;
  readonly #restoring: boolean;
  readonly #encodeInput: (input: I) => Effect.Effect<unknown>;

  readonly #ephemeralBuffer = new EphemeralTraceBuffer();
  readonly #ephemeralSubscribers: Queue.Queue<Option.Option<Trace.Message>>[] = [];

  readonly #onFinished: ((state: Process.State, cause?: Cause.Cause<never>) => Effect.Effect<void>) | undefined;
  readonly #onStatusChanged: (() => void) | undefined;
  readonly #hasRunningChildren: () => boolean;

  constructor(
    readonly pid: Process.ID,
    parentId: Process.ID | null,
    callbacks: Process.Callbacks<I, O, R>,
    scope: Scope.CloseableScope,
    services: Context.Context<R | Process.BaseServices>,
    registry: Registry.Registry,
    outputQueue: Queue.Queue<OutputItem<O>>,
    storage: StorageService.Service,
    key: string,
    params: Process.Params,
    environment: ProcessManager.Environment,
    traceSink: Trace.Sink,
    onFinished?: (state: Process.State, cause?: Cause.Cause<never>) => Effect.Effect<void>,
    onStatusChanged?: () => void,
    hasRunningChildren?: () => boolean,
    persistence?: Persistence,
    restoring?: boolean,
    encodeInput?: (input: I) => Effect.Effect<unknown>,
    initialState?: Process.State,
  ) {
    this.parentId = parentId;
    this.key = key;
    this.params = params;
    this.environment = environment;
    this.#callbacks = callbacks;
    this.#scope = scope;
    this.#services = services;
    this.#registry = registry;
    this.#outputQueue = outputQueue;
    this.#traceSink = traceSink;
    this.#storage = storage;
    this.#onFinished = onFinished;
    this.#onStatusChanged = onStatusChanged;
    this.#hasRunningChildren = hasRunningChildren ?? (() => false);
    this.#persistence = persistence ?? NOOP_PERSISTENCE;
    this.#restoring = restoring ?? false;
    this.#encodeInput = encodeInput ?? ((input) => Effect.succeed(input));

    this.#currentStatus = {
      state: initialState ?? Process.State.RUNNING,
      exit: Option.none(),
      startedAt: new Date(),
      completedAt: Option.none(),
    };
    this.statusAtom = Atom.make<ProcessManager.Status>(this.#currentStatus);
    this.#registry.mount(this.statusAtom);
    log('lifecycle: created', { parentId, key, params });
  }

  snapshotStatus(): ProcessManager.Status {
    return this.#currentStatus;
  }

  snapshotProcessInfo(): Process.Info {
    const status = this.#currentStatus;
    const error = Option.getOrNull(
      Option.flatMap(status.exit, (ex) =>
        Exit.match(ex, {
          onFailure: (cause) => Option.some(Cause.pretty(cause)),
          onSuccess: () => Option.none(),
        }),
      ),
    );
    return {
      pid: this.pid,
      parentPid: this.parentId,
      key: this.key,
      params: this.params,
      state: status.state,
      error,
      startedAt: status.startedAt.getTime(),
      completedAt: Option.map(status.completedAt, (date) => date.getTime()),
      metrics: {
        wallTime: this.#wallTimeMs,
        inputCount: this.#inputCount,
        outputCount: this.#outputCount,
      },
    };
  }

  /** Run process onSpawn. Called by ProcessManagerImpl after spawn. */
  runOnSpawn(seq?: number): Effect.Effect<void> {
    if (this.#restoring) {
      log('lifecycle: onspawn skipped (restoring)');
      return Effect.void;
    }
    log('lifecycle: onspawn');
    return this.#runHandler('spawn', () => this.#callbacks.onSpawn(), seq).pipe(Effect.flatMap(Fiber.join));
  }

  submitInput(input: I): Effect.Effect<void> {
    if (this.#finished) {
      return Effect.void;
    }
    this.#inputCount++;
    log('lifecycle: input', { n: this.#inputCount });
    return Effect.gen(this, function* () {
      const encoded = yield* this.#encodeInput(input);
      const seq = yield* this.#persistence.appendEvent({ _tag: 'input', value: encoded });
      yield* this.#runHandler('input', () => this.#callbacks.onInput(input), seq).pipe(Effect.asVoid);
    });
  }

  subscribeOutputs(): Stream.Stream<O> {
    return Stream.fromQueue(this.#outputQueue).pipe(Stream.takeWhile(Option.isSome), Stream.map(Option.getOrThrow));
  }

  pushEphemeral(event: Trace.Message): void {
    this.#ephemeralBuffer.push(event);
    for (const queue of this.#ephemeralSubscribers) {
      Queue.unsafeOffer(queue, Option.some(event));
    }
  }

  subscribeEphemeral(): Stream.Stream<Trace.Message> {
    return Stream.unwrap(
      Effect.gen(this, function* () {
        const snapshot = [...this.#ephemeralBuffer.buffer];
        const queue = yield* Queue.unbounded<Option.Option<Trace.Message>>();
        this.#ephemeralSubscribers.push(queue);
        return Stream.concat(
          Stream.fromIterable(snapshot),
          Stream.fromQueue(queue).pipe(Stream.takeWhile(Option.isSome), Stream.map(Option.getOrThrow)),
        );
      }),
    );
  }

  terminate(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      if (this.#finished) {
        log('lifecycle: terminate skipped (already finished)');
        return;
      }
      log('lifecycle: terminating');
      this.#finished = true;
      this.#setStatus(Process.State.TERMINATING);
      yield* this.#cleanup();
      this.#setStatus(Process.State.TERMINATED, Exit.void);
    });
  }

  /**
   * Stop in-memory scheduling (alarm timer, scope) without terminating the process
   * or clearing its storage. The persisted record (state, alarmDueAt, events) is left
   * intact so the process can be restored by a future manager. Used on app shutdown.
   */
  suspend(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      if (this.#finished) {
        return;
      }
      log('lifecycle: suspend');
      // Prevent spurious state transitions if handler fibers are interrupted.
      this.#finished = true;
      // Clears in-memory timer only; does NOT touch persisted alarmDueAt.
      this.#clearAlarm();
      Queue.unsafeOffer(this.#outputQueue, Option.none());
      for (const queue of this.#ephemeralSubscribers) {
        Queue.unsafeOffer(queue, Option.none());
      }
      this.#ephemeralSubscribers.length = 0;
      yield* Scope.close(this.#scope, Exit.void);
    });
  }

  /**
   * Re-arm the in-memory alarm timer for a persisted due-time (used by restore).
   * Does NOT persist the alarm — it is already in the persisted record.
   */
  rearmAlarm(dueAt: number): void {
    if (this.#finished) {
      return;
    }
    this.#clearAlarm();
    const delay = Math.max(0, dueAt - Date.now());
    this.#alarmDueAt = dueAt;
    log('lifecycle: alarm rearmed', { dueAt, delayMs: delay });
    this.#alarmTimer = setTimeout(() => this.#fireAlarm(), delay);
  }

  /**
   * Re-deliver a persisted event that never settled before shutdown.
   * Called by the manager during restore, in seq order.
   */
  redeliver(event: PersistedEvent, definition: Process.Process<I, O, any>): Effect.Effect<void> {
    switch (event._tag) {
      case 'spawn':
        return this.#runHandler('spawn', () => this.#callbacks.onSpawn(), event.seq).pipe(Effect.flatMap(Fiber.join));
      case 'input':
        return Effect.gen(this, function* () {
          // The runtime assumes handlers are idempotent: an input whose handler was interrupted
          // is always re-delivered. Operations that are not idempotent guard against unsafe
          // retries themselves (see `Process.fromOperation`).
          // event.value is persisted JSON; cast required at deserialization boundary since
          // Process.Process<I,O,R> does not expose the input Schema (runtime object does).
          const defWithSchema = definition as unknown as { input: Schema.Schema<I, unknown, never> };
          const input = yield* Schema.decode(defWithSchema.input)(event.value).pipe(Effect.orDie);
          yield* yield* this.#runHandler('input', () => this.#callbacks.onInput(input), event.seq);
        });
      case 'alarm':
        return this.#dispatchAlarm(event.seq);
      case 'childEvent':
        return this.#runHandler(
          'childEvent',
          () => this.#callbacks.onChildEvent(fromPersistedChildEvent(event.event)),
          event.seq,
        ).pipe(Effect.asVoid);
    }
  }

  runToCompletion(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const deferred = yield* Deferred.make<void>();
      const unsubscribe = this.#registry.subscribe(
        this.statusAtom,
        (state) => {
          switch (state.state) {
            case Process.State.SUCCEEDED:
            case Process.State.TERMINATED:
            case Process.State.IDLE:
              return Effect.runSync(Deferred.succeed(deferred, undefined));
            case Process.State.FAILED:
              const error = state.exit.pipe(
                Option.flatMap(Exit.causeOption),
                Option.map(Cause.pretty),
                Option.getOrElse(() => 'Process failed with unknown error'),
              );
              return Effect.runSync(Deferred.die(deferred, error));
          }
        },
        { immediate: true },
      );
      yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));
      yield* Deferred.await(deferred);
    }).pipe(Effect.scoped);
  }

  runAndExit(options: { readonly inputs: readonly I[] }): Stream.Stream<O> {
    const { inputs } = options;
    return Stream.unwrap(
      Effect.gen(this, function* () {
        // Make sure we dont miss any outputs.
        const outputs = this.subscribeOutputs().pipe(Stream.interruptWhen(this.#runAndExitInterruptEffect()));
        yield* Effect.forEach(inputs, (input) => this.submitInput(input));
        yield* this.#assertRunAndExitProcessActive();
        return outputs;
      }),
    );
  }

  #assertRunAndExitProcessActive(): Effect.Effect<void> {
    const { state, exit } = this.#currentStatus;
    if (state === Process.State.TERMINATED) {
      return Effect.dieMessage('Process was terminated');
    }
    if (state === Process.State.FAILED) {
      const message = exit.pipe(
        Option.flatMap(Exit.causeOption),
        Option.map(Cause.pretty),
        Option.getOrElse(() => 'Process failed with unknown error'),
      );
      return Effect.die(message);
    }
    return Effect.void;
  }

  /**
   * Completes when the process becomes IDLE or SUCCEEDED (interrupt output stream). Defects on FAILED or TERMINATED.
   */
  #runAndExitInterruptEffect(): Effect.Effect<void, never, never> {
    return Effect.gen(this, function* () {
      const deferred = yield* Deferred.make<void>();
      const unsubscribe = this.#registry.subscribe(
        this.statusAtom,
        (state) => {
          switch (state.state) {
            case Process.State.IDLE:
            case Process.State.SUCCEEDED:
              return Effect.runSync(Deferred.succeed(deferred, undefined));
            case Process.State.FAILED: {
              const error = state.exit.pipe(
                Option.flatMap(Exit.causeOption),
                Option.map(Cause.pretty),
                Option.getOrElse(() => 'Process failed with unknown error'),
              );
              return Effect.runSync(Deferred.die(deferred, error));
            }
            case Process.State.TERMINATED:
              return Effect.runSync(Deferred.die(deferred, 'Process was terminated'));
            default:
              return Effect.void;
          }
        },
        { immediate: true },
      );
      yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));
      yield* Deferred.await(deferred);
    }).pipe(Effect.scoped);
  }

  get status(): ProcessManager.Status {
    return this.#currentStatus;
  }

  requestSucceed(): void {
    this.#succeedRequested = true;
  }

  requestFail(error: Error): void {
    this.#failError = error;
  }

  // TODO(dmaretskyi): Update to make it prefer the earliest alarm.
  requestAlarm(timeout?: number): void {
    if (this.#finished) {
      return;
    }
    this.#clearAlarm();
    const delay = timeout ?? 0;
    const dueAt = Date.now() + delay;
    this.#alarmDueAt = dueAt;
    log('lifecycle: alarm scheduled', { delayMs: delay, dueAt });
    // alarmDueAt is persisted after the handler settles (in #runHandler success pipeline).
    this.#alarmTimer = setTimeout(() => this.#fireAlarm(), delay);
  }

  #fireAlarm(): void {
    this.#alarmTimer = null;
    this.#alarmDueAt = null;
    Effect.runFork(this.#persistence.setAlarm(null));
    if (this.#finished) {
      return;
    }
    Effect.runFork(
      this.#persistence.appendEvent({ _tag: 'alarm' }).pipe(Effect.flatMap((seq) => this.#dispatchAlarm(seq))),
    );
  }

  #dispatchAlarm(seq: number): Effect.Effect<void> {
    return this.#runHandler('alarm', () => this.#callbacks.onAlarm(), seq).pipe(
      Effect.flatMap(Fiber.join),
      this.#alarmSemaphore.withPermits(1),
    );
  }

  requestSubmitOutput(output: O): void {
    log('lifecycle: submit output', { pid: this.pid });
    this.#outputCount++;
    this.#onStatusChanged?.();
    Queue.unsafeOffer(this.#outputQueue, Option.some(output));
  }

  requestChildEvent(event: Process.ChildEvent<unknown>): void {
    log('lifecycle: child event', { tag: event._tag, childPid: event.pid });
    Effect.runFork(
      this.#persistence
        .appendEvent({ _tag: 'childEvent', event: toPersistedChildEvent(event) })
        .pipe(Effect.flatMap((seq) => this.#runHandler('childEvent', () => this.#callbacks.onChildEvent(event), seq))),
    );
  }

  #runHandler(
    name: string,
    fn: () => Effect.Effect<void, never, R | Process.BaseServices>,
    eventSeq?: number,
  ): Effect.Effect<Fiber.RuntimeFiber<void>> {
    return Effect.uninterruptibleMask((restore) =>
      Effect.gen(this, function* () {
        this.#activeHandlers++;
        this.#setStatus(Process.State.RUNNING);
        log('begin handler', { pid: this.pid, state: this.#currentStatus.state, activeHandlers: this.#activeHandlers });
        const t0 = performance.now();
        const recordWall = () => {
          this.#wallTimeMs += performance.now() - t0;
        };
        return yield* restore(fn()).pipe(
          Effect.provide(this.#services),
          Effect.tap(() => Effect.sync(recordWall)),
          Performance.addTrackEntry({
            name,
            detail: {
              pid: this.pid,
              key: this.key,
              params: this.params,
            },
            devtools: {
              dataType: 'track-entry',
              track: 'Process',
              trackGroup: 'Compute',
              color: 'primary',
            },
          }),
          Effect.tap(() => (eventSeq !== undefined ? this.#persistence.removeEvent(eventSeq) : Effect.void)),
          Effect.tap(() => this.#handlerCompleted()),
          // Persist alarm due-time and state after each handler settles. These are awaited (not
          // fire-and-forget) so the durable record is consistent before spawn() returns. The
          // calls are no-ops when the record has already been deleted (terminal state).
          Effect.tap(() => this.#persistence.setAlarm(this.#alarmDueAt)),
          Effect.tap(() => this.#persistence.setState(this.#currentStatus.state)),
          Effect.catchAllCause((cause) =>
            Effect.gen(this, function* () {
              recordWall();
              // Do NOT remove the event on a pure interruption — the scope was closed for
              // suspend/restart, so the event must stay in the mailbox for re-delivery.
              if (eventSeq !== undefined && !Cause.isInterruptedOnly(cause)) {
                yield* this.#persistence.removeEvent(eventSeq);
              }
              yield* this.#handleError(cause);
            }),
          ),
          Effect.forkIn(this.#scope),
        );
      }),
    );
  }

  #handlerCompleted(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this.#activeHandlers--;
      log('handler completed', { pid: this.pid, activeHandlers: this.#activeHandlers, finished: this.#finished });

      if (this.#finished) {
        return;
      }

      if (this.#failError !== null && this.#activeHandlers === 0) {
        this.#finished = true;
        const error = this.#failError;
        yield* this.#cleanup().pipe(
          Effect.tap(() => this.#setStatus(Process.State.FAILED, Exit.die(error))),
          Effect.tap(() => this.#onFinished?.(Process.State.FAILED, Cause.die(error)) ?? Effect.void),
        );
      } else if (this.#succeedRequested && this.#activeHandlers === 0) {
        this.#finished = true;
        yield* this.#cleanup().pipe(
          Effect.tap(() => this.#setStatus(Process.State.SUCCEEDED, Exit.void)),
          Effect.tap(() => this.#onFinished?.(Process.State.SUCCEEDED) ?? Effect.void),
        );
      } else if (this.#activeHandlers === 0) {
        const hybernating = this.#alarmTimer !== null || this.#hasRunningChildren();
        this.#setStatus(hybernating ? Process.State.HYBERNATING : Process.State.IDLE);
      }
    });
  }

  #handleError(cause: Cause.Cause<never>): Effect.Effect<void> {
    this.#activeHandlers--;
    if (this.#finished) {
      log('lifecycle: failure ignored (already finished)');
      return Effect.void;
    }
    return this.#failImmediately(cause);
  }

  /** Transitions the process to FAILED without touching activeHandlers. Used by redeliver. */
  #failImmediately(cause: Cause.Cause<never>): Effect.Effect<void> {
    if (this.#finished) {
      return Effect.void;
    }
    log('lifecycle: failed', { cause: Cause.pretty(cause) });
    this.#finished = true;
    return Effect.gen(this, function* () {
      this.#setStatus(Process.State.FAILED, Exit.failCause(cause));
      yield* this.#cleanup();
      yield* this.#onFinished?.(Process.State.FAILED, cause) ?? Effect.void;
    });
  }

  #cleanup(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      log('lifecycle: cleanup');
      this.#clearAlarm();
      Queue.unsafeOffer(this.#outputQueue, Option.none());
      for (const queue of this.#ephemeralSubscribers) {
        Queue.unsafeOffer(queue, Option.none());
      }
      this.#ephemeralSubscribers.length = 0;
      yield* this.#storage.clear();
      yield* Scope.close(this.#scope, Exit.void);
      yield* this.#persistence.deleteRecord();
    });
  }

  #clearAlarm(): void {
    if (this.#alarmTimer !== null) {
      clearTimeout(this.#alarmTimer);
      this.#alarmTimer = null;
    }
  }

  #setStatus(state: Process.State, exit?: Exit.Exit<void>) {
    if (state !== this.#currentStatus.state) {
      log('lifecycle: state', { state, previous: this.#currentStatus.state });
    }
    const isTerminal =
      state === Process.State.SUCCEEDED || state === Process.State.TERMINATED || state === Process.State.FAILED;
    this.#currentStatus = {
      state,
      exit: exit ? Option.some(exit) : Option.none(),
      startedAt: this.#currentStatus.startedAt,
      completedAt: isTerminal ? Option.some(new Date()) : Option.none(),
    };
    log('state updated', { pid: this.pid, state });
    this.#registry.set(this.statusAtom, this.#currentStatus);
    this.#onStatusChanged?.();
    // State is persisted after handlers settle (in #runHandler success pipeline).
  }
}
