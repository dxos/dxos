//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as PubSub from 'effect/PubSub';
import * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';

import { Performance } from '@dxos/effect';
import { log } from '@dxos/log';

import { Capabilities } from '../../common';
import * as ActivationEvent from '../activation-event';
import * as Capability from '../capability';
import * as CapabilityManager from '../capability-manager';
import { CapabilityNotFoundError, ProvidesMismatchError } from '../errors';
import * as Plugin from '../plugin';
import { type ManagerState } from './manager-state';
import { type PluginFailurePhase, PluginTimeoutError } from './manager-types';

/**
 * Yields the host's event loop before a module body runs. Effect's scheduler drains its run queue
 * within one macrotask, so a wave of cache-hit module activations otherwise fuses into one
 * multi-second long task that blocks paint and input (measured: 2 s max task, ~4.7 s TBT at boot).
 *
 * Prefers `scheduler.yield()` (input-priority aware); falls back to a MessageChannel hop, which is
 * a real macrotask boundary without `setTimeout`'s clamp. The fallback is `Effect.callback` rather
 * than a hand-built promise so an interrupt closes the ports instead of leaking a channel per
 * yield — this runs between every module activation, so a few hundred times at boot.
 */
export const yieldToHost: Effect.Effect<void> = Effect.suspend(() => {
  const scheduler = globalThis.scheduler;
  // Feature-tested, not just presence-checked: Chromium shipped `postTask` before `yield`.
  if (typeof scheduler?.yield === 'function') {
    return Effect.promise(() => scheduler.yield());
  }
  if (typeof MessageChannel === 'undefined') {
    return Effect.void;
  }
  return Effect.callback<void>((resume) => {
    const { port1, port2 } = new MessageChannel();
    const close = () => {
      port1.close();
      port2.close();
    };
    port1.onmessage = () => {
      close();
      resume(Effect.void);
    };
    port2.postMessage(null);
    return Effect.sync(close);
  });
});

/**
 * Owns the per-module load pipeline and its bookkeeping: memoized loads (id -> Deferred),
 * per-module semaphores, activation scopes, and the contributed-capability index. Every
 * activation path (dependency round, event wave, on-demand pull) converges on {@link load};
 * concurrent paths await the same deferred, and {@link contribute} is idempotent per module.
 *
 * Module bodies run with the manager as the ambient `Plugin.Service`; the loader carries that
 * as a typed requirement (`R = Plugin.Service`) rather than holding a manager reference — the
 * manager satisfies it once at its public boundary.
 */
export class ModuleLoader {
  readonly #memo = new Map<Plugin.PluginModule['id'], Deferred.Deferred<Capability.Any[], Error>>();
  readonly #semaphores = new Map<Plugin.PluginModule['id'], Semaphore.Semaphore>();
  readonly #scopes = new Map<string, Scope.Closeable>();
  readonly #contributed = new Map<string, Capability.Any[]>();
  readonly #state: ManagerState;
  readonly #capabilities: CapabilityManager.CapabilityManager;
  readonly #activationTimeout: Duration.Input;
  readonly #yieldToHost: Effect.Effect<void>;

  constructor(
    state: ManagerState,
    capabilities: CapabilityManager.CapabilityManager,
    activationTimeout: Duration.Input,
    /** Injected so the host yield is explicit at the composition root, and swappable in tests. */
    yieldToHostEffect: Effect.Effect<void> = yieldToHost,
  ) {
    this.#state = state;
    this.#capabilities = capabilities;
    this.#activationTimeout = activationTimeout;
    this.#yieldToHost = yieldToHostEffect;
  }

  /** Whether the module's load has started (memoized) — settled or not. */
  isLoading(moduleId: string): boolean {
    return this.#memo.has(moduleId);
  }

  /** Whether the module's capabilities have been ingested into the registry. */
  hasContributed(moduleId: string): boolean {
    return this.#contributed.has(moduleId);
  }

  /**
   * Loads a module exactly once. `parentEvent` is the activation event that first triggered
   * the load — included in `activating`/`activated` messages so subscribers (e.g. the boot
   * loader's status listener) can associate a module with its triggering event; later paths
   * await the cached deferred without re-publishing.
   */
  load = (module: Plugin.PluginModule, parentEvent: string): Effect.Effect<Capability.Any[], Error, Plugin.Service> =>
    Effect.gen({ self: this }, function* () {
      const semaphore = this.#semaphore(module.id);

      // Atomically check-and-set under per-module semaphore to prevent race conditions.
      const deferredToAwait = yield* Effect.gen({ self: this }, function* () {
        const existing = this.#memo.get(module.id);
        if (existing) {
          return existing;
        }

        // First caller - create deferred, store it, and start loading in background.
        const deferred = yield* Deferred.make<Capability.Any[], Error>();
        this.#memo.set(module.id, deferred);

        const scope = yield* Scope.make();

        // Fork the load to run in background, completing the deferred when done.
        const fiber = yield* Effect.forkDetach(
          this.#runActivation(module, parentEvent, scope).pipe(
            Effect.tap((result) => Deferred.succeed(deferred, result)),
            Effect.catchCause((cause) =>
              this.#recordActivationFailure(module, parentEvent, cause).pipe(
                Effect.flatMap((error) => Deferred.fail(deferred, error)),
              ),
            ),
          ),
        );
        yield* this.#state.fibers.trackForked(fiber);

        return deferred;
      }).pipe(semaphore.withPermits(1));

      // Wait for result outside the semaphore so multiple waiters can proceed concurrently.
      return yield* Deferred.await(deferredToAwait);
    });

  /**
   * Awaits an in-flight load without starting one. A module with no memoized load — never
   * started, or deactivated mid-wait (deactivation clears the memo) — counts as settled;
   * joining via {@link load} instead would RESTART such a module (e.g. re-activating a
   * timed-out module of an auto-disabled plugin).
   */
  awaitSettled(moduleId: string): Effect.Effect<void> {
    const deferred = this.#memo.get(moduleId);
    return deferred ? Deferred.await(deferred).pipe(Effect.ignore, Effect.asVoid) : Effect.void;
  }

  /**
   * Awaits every in-flight load until none remain, to a fixpoint (a settling load can start
   * new ones). Returns whether anything was pending. Used by streaming startup: forked
   * enable-chain passes load modules outside `start()`'s own passes, and the ready signal
   * must not publish while any of them are mid-load.
   */
  awaitAllSettled(): Effect.Effect<boolean> {
    return Effect.gen({ self: this }, function* () {
      let waited = false;
      for (;;) {
        const pending: Deferred.Deferred<any, Error>[] = [];
        for (const deferred of this.#memo.values()) {
          if (!(yield* Deferred.isDone(deferred))) {
            pending.push(deferred);
          }
        }
        if (pending.length === 0) {
          return waited;
        }
        waited = true;
        yield* Effect.all(
          pending.map((deferred) => Deferred.await(deferred).pipe(Effect.ignore)),
          { concurrency: 'unbounded', discard: true },
        );
      }
    });
  }

  /**
   * Ingests a module's expanded capabilities into the registry and marks it active. A module
   * may be reached by more than one activation path; the load is memoized, so contribution is
   * memoized too.
   */
  contribute(module: Plugin.PluginModule, capabilities: Capability.Any[]): Effect.Effect<void, Error> {
    return Effect.gen({ self: this }, function* () {
      if (this.#contributed.has(module.id)) {
        return;
      }
      capabilities.forEach((capability) => {
        this.#capabilities.contribute({ module: module.id, ...capability });
      });
      this.#state.markActive(module.id);
      this.#contributed.set(module.id, capabilities);
    });
  }

  /** Removes the module's contributions and closes its scope (running its finalizers). */
  deactivate(module: Plugin.PluginModule): Effect.Effect<boolean, Error> {
    return Effect.gen({ self: this }, function* () {
      const id = module.id;
      log('deactivating', { id });
      this.#memo.delete(id);

      const capabilities = this.#contributed.get(id);
      if (capabilities) {
        for (const capability of capabilities) {
          this.#capabilities.remove(capability.interface, capability.implementation);
        }
        this.#contributed.delete(id);
      }

      const scope = this.#scopes.get(id);
      if (scope) {
        yield* Scope.close(scope, Exit.void);
        this.#scopes.delete(id);
      }

      this.#state.markInactive(id);

      log('deactivated', { id });
      return true;
    });
  }

  /** Shutdown: drop all memoized loads and close every activation scope. */
  clear(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      this.#memo.clear();
      for (const scope of this.#scopes.values()) {
        yield* Scope.close(scope, Exit.void);
      }
      this.#scopes.clear();
    });
  }

  /**
   * Builds the Effect context for a module's declared requires: singleton capabilities
   * resolve to their implementation (waiting — bounded by the activation timeout — for
   * concurrent providers), multi capabilities to their live contributions view.
   */
  #resolveRequires(module: Plugin.PluginModule): Effect.Effect<Context.Context<never>, Error> {
    return Effect.gen({ self: this }, function* () {
      const spec = module.activation;
      if (spec.requires.length === 0) {
        return Context.empty();
      }

      const services = new Map<string, unknown>();
      for (const capability of spec.requires) {
        if (capability.arity === 'multi') {
          services.set(capability.key, this.#capabilities.contributions(capability));
          continue;
        }
        const [existing] = this.#capabilities.getAll(capability);
        const implementation =
          existing !== undefined
            ? existing
            : yield* this.#capabilities.waitFor(capability).pipe(
                Effect.timeoutOrElse({
                  duration: this.#activationTimeout,
                  orElse: () =>
                    Effect.fail(
                      new CapabilityNotFoundError({
                        identifier: capability.identifier,
                        registered: this.#capabilities.listRegisteredIdentifiers(),
                      }),
                    ),
                }),
              );
        services.set(capability.key, implementation);
      }
      return Context.makeUnsafe(services);
    });
  }

  #semaphore(moduleId: Plugin.PluginModule['id']): Semaphore.Semaphore {
    let semaphore = this.#semaphores.get(moduleId);
    if (!semaphore) {
      semaphore = Semaphore.makeUnsafe(1);
      this.#semaphores.set(moduleId, semaphore);
    }
    return semaphore;
  }

  /**
   * The activation pipeline for one module: settle in-flight multi providers, build the
   * requires context, run the module's activate under the activation timeout, validate the
   * result against the declared provides, and expand it to registry entries. Instrumented
   * with a span, a slow-activation warning, and a devtools track entry.
   */
  /**
   * A surface rendering is the demand signal for its own plugin: the feature is now in use, so
   * the contributions other plugins target at it (editor extensions, variants, integrations)
   * should load. Firing here rather than from a blanket post-startup sweep is what keeps an
   * unvisited feature's code off the wire entirely.
   *
   * Forked, not awaited: contributions are read through the reactive capability atoms, so a
   * consumer re-renders when they land, and awaiting here would deadlock a surface behind
   * modules that may themselves resolve surfaces. Re-firing an already-fired event is a no-op
   * in the manager, so no dedup is needed at this call site.
   */
  #fireOwnStartForSurface(
    capabilities: readonly Capability.Any[],
    pluginId: string | undefined,
  ): Effect.Effect<void, never, Plugin.Service> {
    if (!pluginId || !capabilities.some((capability) => capability.interface === Capabilities.ReactSurface)) {
      return Effect.void;
    }
    return Effect.gen(function* () {
      const manager = yield* Plugin.Service;
      yield* manager.activate(ActivationEvent.pluginStart(pluginId)).pipe(
        Effect.catch((error) =>
          Effect.sync(() => log.warn('plugin start event failed', { pluginId, error: String(error) })),
        ),
        Effect.forkDetach,
      );
    });
  }

  #runActivation(
    module: Plugin.PluginModule,
    parentEvent: string,
    scope: Scope.Closeable,
  ): Effect.Effect<Capability.Any[], Error, Plugin.Service> {
    return Effect.gen({ self: this }, function* () {
      log('loading module', { module: module.id, parentEvent });
      performance.mark(`module:${module.id}:start`);
      // Separate mark: the profiler reads `module:` as a measure, and a measure drops mark detail.
      performance.mark(`module-cause:${module.id}`, { detail: { event: parentEvent } });
      yield* PubSub.publish(this.#state.activation, { event: parentEvent, state: 'activating', module: module.id });
      const pluginId = this.#state.pluginIdOfModule(module.id);
      yield* this.#awaitProvidersInFlight(module);
      const requiresContext = yield* this.#resolveRequires(module);
      // One host yield per module keeps activation tasks under the long-task threshold;
      // counted as wait, not run, by the split below.
      yield* this.#yieldToHost;
      // Wait/run split: `module:<id>` spans the whole pipeline, so scheduling delay (in-flight
      // providers + requires resolution) is indistinguishable from work without these sub-measures.
      performance.mark(`module:${module.id}:run`);
      performance.measure(`module-wait:${module.id}`, `module:${module.id}:start`, `module:${module.id}:run`);
      const [duration, capabilities] = yield* module.activate().pipe(
        Effect.provide(requiresContext),
        Effect.provideService(Capability.Service, this.#capabilities),
        Effect.provideService(Capability.CurrentModuleId, module.id),
        Effect.updateService(Capability.ActivatingModuleIds, (ids) => new Set([...ids, module.id])),

        Scope.provide(scope),
        // Cap activation so a single misbehaving module can't hold the
        // event chain open. On timeout the failure is recorded against
        // the plugin and surfaced as `PluginTimeoutError`.
        Effect.timeoutOrElse({
          duration: this.#activationTimeout,
          orElse: () =>
            Effect.fail(
              new PluginTimeoutError({
                context: { id: pluginId ?? module.id, module: module.id, phase: 'activation' as PluginFailurePhase },
              }),
            ),
        }),
        Effect.timed,
      );
      const normalized = CapabilityManager.normalizeActivateResult(capabilities);
      yield* this.#validateProvides(module, normalized);

      this.#scopes.set(module.id, scope);
      const elapsed = Duration.toMillis(duration);
      performance.mark(`module:${module.id}:end`);
      performance.measure(`module:${module.id}`, `module:${module.id}:start`, `module:${module.id}:end`);
      performance.measure(`module-run:${module.id}`, `module:${module.id}:run`, `module:${module.id}:end`);
      yield* PubSub.publish(this.#state.activation, { event: parentEvent, state: 'activated', module: module.id });

      log('loaded module', {
        module: module.id,
        parentEvent,
        elapsed,
        failed: false,
      });
      const expanded = CapabilityManager.expandContributions(normalized);
      yield* this.#fireOwnStartForSurface(expanded, pluginId);
      return expanded;
    }).pipe(
      Effect.tapCause(() => Scope.close(scope, Exit.void)),
      Effect.withSpan('ModuleLoader.load'),
      together(
        Effect.sleep(Duration.seconds(10)).pipe(
          Effect.andThen(
            Effect.sync(() => log.warn(`module is taking a long time to activate`, { module: module.id })),
          ),
        ),
      ),
      Performance.addTrackEntry({
        name: module.id,
        devtools: {
          dataType: 'track-entry',
          track: 'Module Activation',
          trackGroup: 'Composer',
          color: 'primary',
        },
      }),
    );
  }

  /**
   * Waits for providers of this module's multi requires whose load has already started in a
   * concurrent round, and ingests their contributions before this module's activate runs.
   * Round-internal ordering only covers providers inside one round — a provider mid-load in a
   * concurrent round (the startup dependency pass while an event-triggered pull runs) is
   * dropped from the pulled round's candidates entirely, so without this a consumer that reads
   * the collection once at startup (e.g. the process manager's `Capabilities.LayerSpec`
   * collection) races the provider's contribution. Bounded by the activation timeout so a
   * multi-capability require cycle (legal — multi requires never block) degrades to the old
   * behaviour instead of deadlocking.
   */
  #awaitProvidersInFlight(module: Plugin.PluginModule): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const multiIdentifiers = new Set(
        module.activation.requires
          .filter((capability) => capability.arity === 'multi')
          .map((capability) => capability.identifier),
      );
      if (multiIdentifiers.size === 0) {
        return;
      }
      const inflight = this.#state
        .getModules()
        .filter(
          (provider) =>
            provider.id !== module.id &&
            !this.#contributed.has(provider.id) &&
            this.#memo.has(provider.id) &&
            provider.activation.provides.some((provided) => multiIdentifiers.has(provided.identifier)),
        );
      if (inflight.length === 0) {
        return;
      }
      log('waiting for in-flight multi providers', { module: module.id, providers: inflight.map((m) => m.id) });
      yield* Effect.forEach(
        inflight,
        (provider) =>
          Effect.gen({ self: this }, function* () {
            const deferred = this.#memo.get(provider.id);
            if (deferred === undefined) {
              return;
            }
            const capabilities = yield* Deferred.await(deferred);
            // Idempotent (memoized per module): the provider's own round contributes the same
            // entries as a no-op when it gets there.
            yield* this.contribute(provider, capabilities);
          }).pipe(
            // A provider that failed to activate resolves to nothing here; its failure is
            // recorded and surfaced by its own load fiber.
            Effect.ignore,
          ),
        { concurrency: 'unbounded', discard: true },
      ).pipe(
        Effect.timeout(this.#activationTimeout),
        Effect.catch(() =>
          Effect.sync(() =>
            log.warn('proceeding without in-flight multi providers', {
              module: module.id,
              providers: inflight.map((m) => m.id),
            }),
          ),
        ),
      );
    });
  }

  /**
   * Runtime provides validation (the authoritative check; the type-level one is best-effort).
   * Validated on the raw items so an empty provideAll still counts as covering its capability.
   * Undeclared contributions fail (they would bypass dependency ordering); missing ones only
   * warn — a provider may legitimately decide at runtime not to contribute (consumers then
   * surface a bounded CapabilityNotFoundError instead of silently proceeding).
   */
  #validateProvides(
    module: Plugin.PluginModule,
    normalized: Array<Capability.Any | Capability.AnyContribution>,
  ): Effect.Effect<void, ProvidesMismatchError> {
    const declared = new Set(module.activation.provides.map((capability) => capability.identifier));
    const returned = new Set(
      normalized.map((item) =>
        CapabilityManager.isContribution(item) ? item.capability.identifier : item.interface.identifier,
      ),
    );
    const missing = [...declared].filter((identifier) => !returned.has(identifier));
    const undeclared = [...returned].filter((identifier) => !declared.has(identifier));
    if (undeclared.length > 0) {
      return Effect.fail(new ProvidesMismatchError({ module: module.id, missing, undeclared }));
    }
    if (missing.length > 0) {
      log.warn('module did not contribute all declared capabilities', { module: module.id, missing });
    }
    return Effect.void;
  }

  /**
   * Failure bookkeeping for a module whose activation failed or died: logs the cause, records
   * the failure against the owning plugin, and publishes an error activation message —
   * symmetric with the 'activating'/'activated' messages so boot UIs observe a failed module,
   * not just a silent stall (the manager's auto-disable policy also watches these messages).
   * Returns the normalized error for the caller to fail the memoized deferred with.
   */
  #recordActivationFailure(
    module: Plugin.PluginModule,
    parentEvent: string,
    cause: Cause.Cause<Error>,
  ): Effect.Effect<Error> {
    return Effect.gen({ self: this }, function* () {
      const error = Cause.squash(cause);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const missingCapability = error instanceof CapabilityNotFoundError ? error.context.identifier : undefined;
      log.error('module failed to activate', {
        module: module.id,
        parentEvent,
        missingCapability,
        registeredCapabilities: this.#capabilities.listRegisteredIdentifiers(),
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        isDefect: !Cause.hasFails(cause),
      });
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      const pluginId = this.#state.pluginIdOfModule(module.id);
      if (pluginId !== undefined) {
        this.#state.recordFailure(pluginId, 'activation', normalizedError);
      }
      yield* PubSub.publish(this.#state.activation, {
        event: parentEvent,
        state: 'error',
        module: module.id,
        error: normalizedError,
      });
      return normalizedError;
    });
  }
}

/**
 * Runs an effect concurrently with another effect.
 * If the first effect completes, the second effect is interrupted.
 */
// TODO(dmaretskyi): Effect.race > Effect.asVoid
export const together =
  <R1>(togetherEffect: Effect.Effect<void, never, R1>) =>
  <A, E, R2>(effect: Effect.Effect<A, E, R2>): Effect.Effect<A, E, R1 | R2> =>
    Effect.gen(function* () {
      const togetherFiber = yield* Effect.forkChild(togetherEffect);
      const result = yield* effect;
      yield* Fiber.interrupt(togetherFiber);
      return result;
    });
