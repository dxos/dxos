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

import { Performance } from '@dxos/effect';
import { log } from '@dxos/log';

import * as Capability from './capability';
import * as CapabilityManager from './capability-manager';
import { CapabilityNotFoundError, ProvidesMismatchError } from './errors';
import { type FiberTracker, type ManagerState } from './manager-state';
import { type ActivationMessage, type PluginFailurePhase, PluginTimeoutError } from './manager-types';
import * as Plugin from './plugin';

export type ModuleLoaderOptions = {
  /** The manager instance provided to module bodies as `Plugin.Service`. */
  pluginService: () => Context.Tag.Service<typeof Plugin.Service>;
  activationTimeout: Duration.DurationInput;
  /** Policy hook for a module whose activation failed (failure recording, auto-disable). */
  onFailure: (pluginId: string, error: Error) => void;
};

/**
 * Owns the per-module load pipeline and its bookkeeping: memoized loads (id -> Deferred),
 * per-module semaphores, activation scopes, and the contributed-capability index. Every
 * activation path (dependency round, event wave, on-demand pull) converges on {@link load};
 * concurrent paths await the same deferred, and {@link contribute} is idempotent per module.
 */
export class ModuleLoader {
  readonly #memo = new Map<Plugin.PluginModule['id'], Deferred.Deferred<Capability.Any[], Error>>();
  readonly #semaphores = new Map<Plugin.PluginModule['id'], Effect.Semaphore>();
  readonly #scopes = new Map<string, Scope.CloseableScope>();
  readonly #contributed = new Map<string, Capability.Any[]>();
  readonly #state: ManagerState;
  readonly #capabilities: CapabilityManager.CapabilityManager;
  readonly #activation: PubSub.PubSub<ActivationMessage>;
  readonly #fibers: FiberTracker;
  readonly #options: ModuleLoaderOptions;

  constructor(
    state: ManagerState,
    capabilities: CapabilityManager.CapabilityManager,
    activation: PubSub.PubSub<ActivationMessage>,
    fibers: FiberTracker,
    options: ModuleLoaderOptions,
  ) {
    this.#state = state;
    this.#capabilities = capabilities;
    this.#activation = activation;
    this.#fibers = fibers;
    this.#options = options;
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
  load = (module: Plugin.PluginModule, parentEvent: string): Effect.Effect<Capability.Any[], Error> =>
    Effect.gen(this, function* () {
      const semaphore = this.#semaphore(module.id);

      // Atomically check-and-set under per-module semaphore to prevent race conditions.
      const deferredToAwait = yield* Effect.gen(this, function* () {
        const existing = this.#memo.get(module.id);
        if (existing) {
          return existing;
        }

        // First caller - create deferred, store it, and start loading in background.
        const deferred = yield* Deferred.make<Capability.Any[], Error>();
        this.#memo.set(module.id, deferred);

        const scope = yield* Scope.make();

        // Fork the load to run in background, completing the deferred when done.
        const fiber = yield* Effect.forkDaemon(
          this.#runActivation(module, parentEvent, scope).pipe(
            Effect.tap((result) => Deferred.succeed(deferred, result)),
            Effect.catchAllCause((cause) =>
              this.#recordActivationFailure(module, parentEvent, cause).pipe(
                Effect.flatMap((error) => Deferred.fail(deferred, error)),
              ),
            ),
          ),
        );
        yield* this.#fibers.track(fiber);
        yield* Effect.forkDaemon(Fiber.await(fiber).pipe(Effect.andThen(() => this.#fibers.untrack(fiber))));

        return deferred;
      }).pipe(semaphore.withPermits(1));

      // Wait for result outside the semaphore so multiple waiters can proceed concurrently.
      return yield* Deferred.await(deferredToAwait);
    });

  /**
   * Ingests a module's expanded capabilities into the registry and marks it active. A module
   * may be reached by more than one activation path; the load is memoized, so contribution is
   * memoized too.
   */
  contribute(module: Plugin.PluginModule, capabilities: Capability.Any[]): Effect.Effect<void, Error> {
    return Effect.gen(this, function* () {
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

  /** Removes the module's contributions, runs deactivate hooks, and closes its scope. */
  deactivate(module: Plugin.PluginModule): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const id = module.id;
      log('deactivating', { id });
      this.#memo.delete(id);

      const capabilities = this.#contributed.get(id);
      if (capabilities) {
        for (const capability of capabilities) {
          this.#capabilities.remove(capability.interface, capability.implementation);
          const program = capability.deactivate?.() ?? Effect.succeed(undefined);
          yield* program;
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
    return Effect.gen(this, function* () {
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
    return Effect.gen(this, function* () {
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
                Effect.timeoutFail({
                  duration: this.#options.activationTimeout,
                  onTimeout: () =>
                    new CapabilityNotFoundError({
                      identifier: capability.identifier,
                      registered: this.#capabilities.listRegisteredIdentifiers(),
                    }),
                }),
              );
        services.set(capability.key, implementation);
      }
      return Context.unsafeMake(services);
    });
  }

  #semaphore(moduleId: Plugin.PluginModule['id']): Effect.Semaphore {
    let semaphore = this.#semaphores.get(moduleId);
    if (!semaphore) {
      semaphore = Effect.runSync(Effect.makeSemaphore(1));
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
  #runActivation(
    module: Plugin.PluginModule,
    parentEvent: string,
    scope: Scope.CloseableScope,
  ): Effect.Effect<Capability.Any[], Error> {
    return Effect.gen(this, function* () {
      log('loading module', { module: module.id, parentEvent });
      performance.mark(`module:${module.id}:start`);
      yield* PubSub.publish(this.#activation, { event: parentEvent, state: 'activating', module: module.id });
      const pluginId = this.#state.pluginIdOfModule(module.id);
      yield* this.#awaitProvidersInFlight(module);
      const requiresContext = yield* this.#resolveRequires(module);
      // Wait/run split: `module:<id>` spans the whole pipeline, so scheduling delay (in-flight
      // providers + requires resolution) is indistinguishable from work without these sub-measures.
      performance.mark(`module:${module.id}:run`);
      performance.measure(`module-wait:${module.id}`, `module:${module.id}:start`, `module:${module.id}:run`);
      const [duration, capabilities] = yield* module.activate().pipe(
        Effect.provide(requiresContext),
        Effect.provideService(Capability.Service, this.#capabilities),
        Effect.provideService(Plugin.Service, this.#options.pluginService()),
        Effect.locally(Capability.CurrentModuleId, module.id),
        Scope.extend(scope),
        // Cap activation so a single misbehaving module can't hold the
        // event chain open. On timeout the failure is recorded against
        // the plugin and surfaced as `PluginTimeoutError`.
        Effect.timeoutFail({
          duration: this.#options.activationTimeout,
          onTimeout: () =>
            new PluginTimeoutError({
              context: { id: pluginId ?? module.id, module: module.id, phase: 'activation' as PluginFailurePhase },
            }),
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
      yield* PubSub.publish(this.#activation, { event: parentEvent, state: 'activated', module: module.id });
      log('loaded module', {
        module: module.id,
        parentEvent,
        elapsed,
        failed: false,
      });
      return CapabilityManager.expandContributions(normalized);
    }).pipe(
      Effect.tapErrorCause(() => Scope.close(scope, Exit.void)),
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
    return Effect.gen(this, function* () {
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
          Effect.gen(this, function* () {
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
        Effect.timeout(this.#options.activationTimeout),
        Effect.catchAll(() =>
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
   * the failure against the owning plugin (scheduling auto-disable), and publishes an error
   * activation message — symmetric with the 'activating'/'activated' messages so boot UIs
   * observe a failed module, not just a silent stall. Returns the normalized error for the
   * caller to fail the memoized deferred with.
   */
  #recordActivationFailure(
    module: Plugin.PluginModule,
    parentEvent: string,
    cause: Cause.Cause<Error>,
  ): Effect.Effect<Error> {
    return Effect.gen(this, function* () {
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
        isDefect: !Cause.isFailure(cause),
      });
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      const pluginId = this.#state.pluginIdOfModule(module.id);
      if (pluginId !== undefined) {
        this.#options.onFailure(pluginId, normalizedError);
      }
      yield* PubSub.publish(this.#activation, {
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
      const togetherFiber = yield* Effect.fork(togetherEffect);
      const result = yield* effect;
      yield* Fiber.interrupt(togetherFiber);
      return result;
    });
