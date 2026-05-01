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
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { Performance } from '@dxos/effect';
import { Process, type StorageService, type Trace } from '@dxos/functions';
import { log } from '@dxos/log';

import type * as ProcessManager from './ProcessManager';
import { EphemeralTraceBuffer } from './trace-buffer';

/**
 * Output queue uses Option to signal completion: Some(value) for data, None for end-of-stream.
 */
export type OutputItem<O> = Option.Option<O>;

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
  #services: Context.Context<R | Process.BaseServices>;
  #alarmSemaphore = Effect.runSync(Effect.makeSemaphore(1));

  readonly #callbacks: Process.Callbacks<I, O, R>;
  readonly #scope: Scope.CloseableScope;
  readonly #registry: Registry.Registry;
  readonly #outputQueue: Queue.Queue<OutputItem<O>>;
  readonly #storage: Context.Tag.Service<typeof StorageService>;
  readonly #traceSink: Trace.Sink;

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
    storage: Context.Tag.Service<typeof StorageService>,
    key: string,
    params: Process.Params,
    environment: ProcessManager.Environment,
    traceSink: Trace.Sink,
    onFinished?: (state: Process.State, cause?: Cause.Cause<never>) => Effect.Effect<void>,
    onStatusChanged?: () => void,
    hasRunningChildren?: () => boolean,
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

    this.#currentStatus = {
      state: Process.State.RUNNING,
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
  runOnSpawn(): Effect.Effect<void> {
    log('lifecycle: onspawn');
    return this.#runHandler('spawn', () => this.#callbacks.onSpawn()).pipe(Effect.flatMap(Fiber.join));
  }

  submitInput(input: I): Effect.Effect<void> {
    if (this.#finished) {
      return Effect.void;
    }
    this.#inputCount++;
    log('lifecycle: input', { n: this.#inputCount });
    return this.#runHandler('input', () => this.#callbacks.onInput(input)).pipe(Effect.asVoid);
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
    log('lifecycle: alarm scheduled', { delayMs: delay });
    this.#alarmTimer = setTimeout(() => {
      this.#alarmTimer = null;
      if (!this.#finished) {
        Effect.runFork(
          this.#runHandler('alarm', () => this.#callbacks.onAlarm()).pipe(
            Effect.flatMap(Fiber.join),
            this.#alarmSemaphore.withPermits(1),
          ),
        );
      }
    }, delay);
  }

  requestSubmitOutput(output: O): void {
    log('lifecycle: submit output', { pid: this.pid });
    this.#outputCount++;
    this.#onStatusChanged?.();
    Queue.unsafeOffer(this.#outputQueue, Option.some(output));
  }

  requestChildEvent(event: Process.ChildEvent<unknown>): void {
    log('lifecycle: child event', { tag: event._tag, childPid: event.pid });
    Effect.runFork(this.#runHandler('childEvent', () => this.#callbacks.onChildEvent(event)));
  }

  #runHandler(
    name: string,
    fn: () => Effect.Effect<void, never, R | Process.BaseServices>,
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
          Effect.tap(() => this.#handlerCompleted()),
          Effect.catchAllCause((cause) =>
            Effect.gen(this, function* () {
              recordWall();
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
  }
}
