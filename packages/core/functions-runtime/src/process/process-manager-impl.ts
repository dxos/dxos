//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import * as Process from './Process';
import * as StorageService from './StorageService';

/**
 * Output queue uses Option to signal completion: Some(value) for data, None for end-of-stream.
 */
type OutputItem<O> = Option.Option<O>;

class ProcessHandleImpl<I, O> implements Process.Handle<I, O> {
  readonly statusAtom: Atom.Writable<Process.Status>;
  private _currentStatus: Process.Status;

  constructor(
    readonly id: Process.ID,
    private readonly _process: Process.Process<I, O>,
    private readonly _scope: Scope.CloseableScope,
    private readonly _registry: Registry.Registry,
    private readonly _outputQueue: Queue.Queue<OutputItem<O>>,
  ) {
    this._currentStatus = {
      state: Process.State.RUNNING,
      exit: Option.none(),
      startedAt: new Date(),
      completedAt: Option.none(),
    };
    this.statusAtom = Atom.make<Process.Status>(this._currentStatus);
    this._registry.mount(this.statusAtom);
  }

  submitInput(input: I): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const outcome = yield* this._process.handleInput(input);
      yield* this._processOutcome(outcome);
    });
  }

  subscribeOutputs(): Stream.Stream<O> {
    return Stream.fromQueue(this._outputQueue).pipe(
      Stream.takeWhile(Option.isSome),
      Stream.map(Option.getOrThrow),
    );
  }

  terminate(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this._setStatus(Process.State.TERMINATING);
      Queue.unsafeOffer(this._outputQueue, Option.none());
      yield* Scope.close(this._scope, Exit.void);
      this._setStatus(Process.State.TERMINATED, Exit.void);
    });
  }

  status(): Effect.Effect<Process.Status> {
    return Effect.sync(() => this._currentStatus);
  }

  /** Run the initial tick and process the outcome. */
  _initialTick(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const outcome = yield* this._process.tick();
      yield* this._processOutcome(outcome);
    });
  }

  _processOutcome(outcome: Process.Outcome): Effect.Effect<void> {
    if (Process.isOutcomeDone(outcome)) {
      Queue.unsafeOffer(this._outputQueue, Option.none());
      this._setStatus(Process.State.COMPLETED, Exit.void);
      return Effect.void;
    }
    if (Process.isOutcomeResume(outcome)) {
      return this._initialTick();
    }
    return Effect.void;
  }

  /** @internal */
  _setStatus(state: Process.State, exit?: Exit.Exit<void>) {
    const isTerminal =
      state === Process.State.COMPLETED || state === Process.State.TERMINATED || state === Process.State.FAILED;
    this._currentStatus = {
      state,
      exit: exit ? Option.some(exit) : Option.none(),
      startedAt: this._currentStatus.startedAt,
      completedAt: isTerminal ? Option.some(new Date()) : Option.none(),
    };
    this._registry.set(this.statusAtom, this._currentStatus);
  }
}

export interface ProcessManagerImplOpts {
  registry: Registry.Registry;
  kvStore: KeyValueStore.KeyValueStore;
}

export class ProcessManagerImpl implements Process.Manager {
  readonly #handles = new Map<Process.ID, ProcessHandleImpl<any, any>>();
  readonly #registry: Registry.Registry;
  readonly #kvStore: KeyValueStore.KeyValueStore;

  constructor(opts: ProcessManagerImplOpts) {
    this.#registry = opts.registry;
    this.#kvStore = opts.kvStore;
  }

  spawn<I, O>(executable: Process.Executable<I, O>): Effect.Effect<Process.Handle<I, O>> {
    return Effect.gen(this, function* () {
      const id = Schema.decodeSync(Process.ID)(crypto.randomUUID());
      const scope = yield* Scope.make();
      const outputQueue = yield* Queue.unbounded<OutputItem<O>>();

      const ctx: Process.ProcessContext<I, O> = {
        id,
        submitOutput: (output: O) => {
          Queue.unsafeOffer(outputQueue, Option.some(output));
        },
      };

      const storage = StorageService.StorageService.scoped(this.#kvStore, `process/${id}/`);

      const process = yield* executable.run(ctx).pipe(
        Effect.provideService(StorageService.StorageService, storage),
        Effect.provideService(Scope.Scope, scope),
      );

      const handle = new ProcessHandleImpl<I, O>(id, process, scope, this.#registry, outputQueue);
      this.#handles.set(id, handle);

      yield* handle._initialTick();

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
