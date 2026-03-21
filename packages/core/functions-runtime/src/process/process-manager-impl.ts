//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import type * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import type { ServiceNotAvailableError } from '../errors';

import * as Process from './Process';
import * as ServiceResolver from './ServiceResolver';
import * as StorageService from './StorageService';

/**
 * Output queue uses Option to signal completion: Some(value) for data, None for end-of-stream.
 */
type OutputItem<O> = Option.Option<O>;

class ProcessHandleImpl<I, O> implements Process.Handle<I, O> {
  readonly statusAtom: Atom.Writable<Process.Status>;

  #currentStatus: Process.Status;
  #activeHandlers = 0;
  #pendingOutcome: Process.Outcome | null = null;
  #finished = false;

  readonly #process: Process.Process<I, O>;
  readonly #scope: Scope.CloseableScope;
  readonly #registry: Registry.Registry;
  readonly #outputQueue: Queue.Queue<OutputItem<O>>;
  readonly #storage: Context.Tag.Service<typeof StorageService.StorageService>;

  constructor(
    readonly id: Process.ID,
    process: Process.Process<I, O>,
    scope: Scope.CloseableScope,
    registry: Registry.Registry,
    outputQueue: Queue.Queue<OutputItem<O>>,
    storage: Context.Tag.Service<typeof StorageService.StorageService>,
  ) {
    this.#process = process;
    this.#scope = scope;
    this.#registry = registry;
    this.#outputQueue = outputQueue;
    this.#storage = storage;

    this.#currentStatus = {
      state: Process.State.RUNNING,
      exit: Option.none(),
      startedAt: new Date(),
      completedAt: Option.none(),
    };
    this.statusAtom = Atom.make<Process.Status>(this.#currentStatus);
    this.#registry.mount(this.statusAtom);
  }

  submitInput(input: I): Effect.Effect<void> {
    if (this.#finished) {
      return Effect.void;
    }
    this.#activeHandlers++;
    return this.#process.handleInput(input).pipe(
      Effect.flatMap((outcome) => this.#recordOutcome(outcome)),
      Effect.catchAllCause((cause) => this.#handleError(cause)),
    );
  }

  subscribeOutputs(): Stream.Stream<O> {
    return Stream.fromQueue(this.#outputQueue).pipe(
      Stream.takeWhile(Option.isSome),
      Stream.map(Option.getOrThrow),
    );
  }

  terminate(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this.#finished = true;
      this.#setStatus(Process.State.TERMINATING);
      yield* this.#cleanup();
      this.#setStatus(Process.State.TERMINATED, Exit.void);
    });
  }

  status(): Effect.Effect<Process.Status> {
    return Effect.sync(() => this.#currentStatus);
  }

  /** Run a tick and record the outcome. Called by ProcessManagerImpl after spawn. */
  runTick(): Effect.Effect<void> {
    this.#activeHandlers++;
    return this.#process.tick().pipe(
      Effect.flatMap((outcome) => this.#recordOutcome(outcome)),
      Effect.catchAllCause((cause) => this.#handleError(cause)),
    );
  }

  /**
   * Record an outcome from a handler and process the merged result when all active handlers complete.
   * Precedence: resume > suspend > done.
   */
  #recordOutcome(outcome: Process.Outcome): Effect.Effect<void> {
    this.#pendingOutcome =
      this.#pendingOutcome === null ? outcome : Process.mergeOutcomes(this.#pendingOutcome, outcome);
    this.#activeHandlers--;

    if (this.#activeHandlers === 0) {
      const finalOutcome = this.#pendingOutcome;
      this.#pendingOutcome = null;
      return this.#processFinalOutcome(finalOutcome);
    }
    return Effect.void;
  }

  /** Process the final merged outcome after all active handlers have completed. */
  #processFinalOutcome(outcome: Process.Outcome): Effect.Effect<void> {
    if (Process.isOutcomeDone(outcome)) {
      this.#finished = true;
      return this.#cleanup().pipe(
        Effect.tap(() => this.#setStatus(Process.State.COMPLETED, Exit.void)),
      );
    }
    if (Process.isOutcomeResume(outcome)) {
      return this.runTick();
    }
    return Effect.void;
  }

  #handleError(cause: Cause.Cause<never>): Effect.Effect<void> {
    this.#finished = true;
    this.#activeHandlers--;
    return this.#cleanup().pipe(
      Effect.tap(() => this.#setStatus(Process.State.FAILED, Exit.failCause(cause))),
    );
  }

  #cleanup(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      Queue.unsafeOffer(this.#outputQueue, Option.none());
      yield* this.#storage.clear();
      yield* Scope.close(this.#scope, Exit.void);
    });
  }

  #setStatus(state: Process.State, exit?: Exit.Exit<void>) {
    const isTerminal =
      state === Process.State.COMPLETED || state === Process.State.TERMINATED || state === Process.State.FAILED;
    this.#currentStatus = {
      state,
      exit: exit ? Option.some(exit) : Option.none(),
      startedAt: this.#currentStatus.startedAt,
      completedAt: isTerminal ? Option.some(new Date()) : Option.none(),
    };
    this.#registry.set(this.statusAtom, this.#currentStatus);
  }
}

export interface ProcessManagerImplOpts {
  registry: Registry.Registry;
  kvStore: KeyValueStore.KeyValueStore;
  serviceResolver?: ServiceResolver.ServiceResolver;
}

export class ProcessManagerImpl implements Process.Manager {
  readonly #handles = new Map<Process.ID, ProcessHandleImpl<any, any>>();
  readonly #registry: Registry.Registry;
  readonly #kvStore: KeyValueStore.KeyValueStore;
  readonly #serviceResolver: ServiceResolver.ServiceResolver;

  constructor(opts: ProcessManagerImplOpts) {
    this.#registry = opts.registry;
    this.#kvStore = opts.kvStore;
    this.#serviceResolver = opts.serviceResolver ?? ServiceResolver.empty;
  }

  spawn<I, O>(executable: Process.Executable<I, O>): Effect.Effect<Process.Handle<I, O>, ServiceNotAvailableError> {
    return Effect.gen(this, function* () {
      const id = Schema.decodeSync(Process.ID)(crypto.randomUUID());
      const scope = yield* Scope.make();
      const outputQueue = yield* Queue.unbounded<OutputItem<O>>();

      const storage = StorageService.StorageService.scoped(this.#kvStore, `process/${id}/`);

      const ctx: Process.ProcessContext<I, O> = {
        id,
        submitOutput: (output: O) => {
          Queue.unsafeOffer(outputQueue, Option.some(output));
        },
      };

      const builtinCtx = Context.empty().pipe(
        Context.add(StorageService.StorageService, storage),
        Context.add(Scope.Scope, scope),
      );

      const externalServices = executable.services.filter(
        (tag) => tag.key !== StorageService.StorageService.key && tag.key !== Scope.Scope.key,
      );

      let serviceCtx: Context.Context<never> = Context.empty() as Context.Context<never>;
      if (externalServices.length > 0) {
        serviceCtx = yield* this.#serviceResolver.resolve(externalServices);
      }

      const fullCtx = Context.merge(builtinCtx, serviceCtx);

      const process = yield* executable.run(ctx).pipe(
        Effect.provide(fullCtx as Context.Context<any>),
      );

      const handle = new ProcessHandleImpl<I, O>(id, process, scope, this.#registry, outputQueue, storage);
      this.#handles.set(id, handle);

      yield* handle.runTick();

      return handle;
    });
  }

  attach<I, O>(id: Process.ID): Effect.Effect<Process.Handle<I, O>> {
    return Effect.gen(this, function* () {
      const handle = this.#handles.get(id);
      if (!handle) {
        return yield* Effect.die(new Error(`Process not found: ${id}`));
      }
      return handle as Process.Handle<I, O>;
    });
  }

  list(): Effect.Effect<readonly Process.Handle.Any[]> {
    return Effect.sync(() => [...this.#handles.values()]);
  }
}

/**
 * Layer that provides ProcessManager backed by ProcessManagerImpl.
 * Requires KeyValueStore from the environment; creates its own Registry internally.
 */
export const ProcessManagerLayer = (opts?: {
  serviceResolver?: ServiceResolver.ServiceResolver;
}): Layer.Layer<Process.ProcessManager, never, KeyValueStore.KeyValueStore> =>
  Layer.effect(
    Process.ProcessManager,
    Effect.gen(function* () {
      const kvStore = yield* KeyValueStore.KeyValueStore;
      const registry = Registry.make();
      return new ProcessManagerImpl({
        registry,
        kvStore,
        serviceResolver: opts?.serviceResolver,
      });
    }),
  );
