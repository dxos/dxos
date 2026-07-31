//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Ref from 'effect/Ref';

import { log } from '@dxos/log';

import * as ActivationEvent from './activation-event';
import * as ActivationGraph from './activation-graph';
import type * as Capability from './capability';
import type * as CapabilityManager from './capability-manager';
import { DependencyCycleError, DuplicateProviderError, MissingProviderError } from './errors';
import { type ActivationMessage } from './manager-types';
import { type ModuleLoader } from './module-loader';
import type * as Plugin from './plugin';

/**
 * Everything the scheduler needs from its owner. Callbacks rather than a manager reference so
 * the scheduling decisions' true inputs stay visible. The two shared Sets are mutable state
 * co-owned with the manager: the catalog marks modules for reactivation (re-enable flows) and
 * clears structural failures on enable; the scheduler consumes and repopulates them.
 */
export type ActivationSchedulerContext = {
  capabilities: CapabilityManager.CapabilityManager;
  loader: ModuleLoader;
  publish: (message: ActivationMessage) => Effect.Effect<void>;
  getActive: () => readonly string[];
  getModules: () => readonly Plugin.PluginModule[];
  /** Inactive modules whose `activatesOn` includes the event. */
  getInactiveModulesByEvent: (key: string) => Plugin.PluginModule[];
  eventsFired: { has: (key: string) => boolean; latch: (key: string) => void };
  /** Whether `start()` has completed registration — gates event-wave cascades. */
  isStarted: () => Effect.Effect<boolean>;
  /** Clears a pending-reset marker when its event re-fires (owned by the reset flow). */
  clearPendingReset: (key: string) => void;
  /** Modules to re-admit into the next round (marked by disable/re-enable flows). */
  pendingReactivate: Set<string>;
  /** Modules excluded from all rounds by a structural error (cycle, duplicate, missing). */
  structurallyFailed: Set<string>;
  getPluginIdForModule: (moduleId: string) => string | undefined;
  /** Records a structural activation failure against the owning plugin. */
  recordFailure: (pluginId: string, error: Error) => void;
  /** In-flight fiber bookkeeping (the manager interrupts these on shutdown). */
  trackFiber: (fiber: Fiber.Fiber<unknown, unknown>) => Effect.Effect<void>;
  untrackFiber: (fiber: Fiber.Fiber<unknown, unknown>) => Effect.Effect<void>;
};

/**
 * Decides when each module's `activate` runs. Two coexisting paths:
 *
 * - {@link runDependencyPass}: dependency-mode modules activate in topological ROUNDS over the
 *   capability graph (see `activation-graph.ts`), to a fixpoint — each round's contributions
 *   (or a concurrent event wave's) can unlock previously pending modules.
 * - {@link activateEvent}: event-mode modules park until their `activatesOn` fires, then run as
 *   an event wave; inactive dependency-mode providers of their requires are pulled on demand
 *   first.
 *
 * Structural problems (cycles, duplicate or missing singleton providers) put the offending
 * plugins into an error state and exclude their modules; everything independent proceeds.
 */
export class ActivationScheduler {
  /** Events currently mid-activation (allOf latching counts them as fired). */
  readonly #activatingEvents = Effect.runSync(Ref.make<string[]>([]));
  /** Modules currently claimed by an event wave (excluded from re-matching). */
  readonly #activatingModules = Effect.runSync(Ref.make<string[]>([]));
  readonly #ctx: ActivationSchedulerContext;

  constructor(ctx: ActivationSchedulerContext) {
    this.#ctx = ctx;
  }

  /** Shutdown support: forget in-flight event/module claims. */
  reset(): Effect.Effect<void> {
    return Effect.all([Ref.set(this.#activatingEvents, []), Ref.set(this.#activatingModules, [])]).pipe(Effect.asVoid);
  }

  /**
   * Runs one activation event: matches parked event-mode modules (with allOf latching), pulls
   * their inactive dependency providers on demand, activates the wave, and cascades the
   * dependency graph so contributions made by the wave can unlock pending chain members.
   */
  activateEvent(
    key: string,
    params: { before?: string; after?: string } | undefined,
    fiber: Fiber.Fiber<unknown, unknown>,
    opts?: { suppressEventMessage?: boolean },
  ): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      yield* this.#ctx.trackFiber(fiber);
      log('activating', { key, ...params });
      yield* Ref.update(this.#activatingEvents, (activating) => Array.append(activating, key));
      this.#ctx.clearPendingReset(key);

      const activatingEvents = yield* this.#activatingEvents;
      const activatingModules = yield* this.#activatingModules;
      const modules = this.#getModulesForActivation(key, activatingEvents, activatingModules);
      if (modules.length === 0) {
        log('no modules to activate', { key });
        this.#ctx.eventsFired.latch(key);
        return false;
      }

      // Event-mode modules resolve their requires on demand: inactive dependency-mode
      // providers of unsatisfied singleton requires are activated first (transitively).
      const eventModules = modules.filter((module) => module.activation.mode === 'event');
      if (eventModules.length > 0) {
        yield* this.#pullDependencyProviders(eventModules);
      }

      const activated = yield* this.#activateModulesForEvent(key, modules, opts);

      // Cascade: this wave's contributions may unlock pending chain members (modules whose
      // providers were gated on this event). Cheap no-op when nothing became satisfiable.
      if (yield* this.#ctx.isStarted()) {
        yield* this.runDependencyPass({});
      }

      return activated;
    }).pipe(
      Effect.ensuring(
        Effect.all([
          this.#ctx.untrackFiber(fiber),
          Ref.update(this.#activatingEvents, (activating) => Array.filter(activating, (event) => event !== key)),
        ]),
      ),
    );
  }

  /**
   * Activates inactive typed modules in topological order of the capability graph, to a
   * fixpoint. Candidates are dependency-mode modules plus event-mode modules whose
   * `activatesOn` events have already fired (the fired-events latch); modules whose singleton
   * requires cannot be satisfied by this pass stay PENDING — they are reconsidered by the
   * next cascade round (each round of contributions, and each event wave, can unlock them).
   * With `candidateModules`, the first round is scoped to those modules (plus pending
   * reactivations); cascade rounds always consider the full pool.
   *
   * Structural problems — duplicate singleton providers within a round, capability cycles,
   * or a singleton requirement no registered module of any mode could ever provide — put
   * the offending plugins into an error state (the `failed` atom, plus an error activation
   * message) and the pass continues with everything else. Individual module activation
   * failures are recorded per plugin (via the loader) and skip that module's transitive
   * dependents without aborting independent modules.
   */
  runDependencyPass(options?: { candidateModules?: Plugin.PluginModule[] }): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      let scoped = options?.candidateModules;
      let ranAny = false;
      let allSucceeded = true;
      // Fixpoint: contributions made by one round (or concurrently by event waves) can make
      // previously pending modules satisfiable. Each round activates at least one module or
      // ends the loop, so this terminates.
      for (;;) {
        const round = yield* this.#runRound(scoped);
        if (round === undefined) {
          break;
        }
        ranAny = true;
        allSucceeded = allSucceeded && round;
        // Cascade rounds consider everything that might have been unlocked.
        scoped = undefined;
      }
      return ranAny && allSucceeded;
    });
  }

  /**
   * Detects capability cycles across the FULL module set, regardless of event gating.
   * Two modules on different activation events that require each other's provides would
   * otherwise pend forever (neither chain can start); this surfaces the lock at startup:
   * the members are put into an error state and excluded — they simply never activate,
   * and everything else proceeds.
   */
  reportGlobalCycle(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const graph = ActivationGraph.buildSingletonGraph(this.#ctx.getModules());
      if (ActivationGraph.computeActivationWaves(graph, ['hard']) !== undefined) {
        return;
      }
      const path = ActivationGraph.findCyclePath(graph, ['hard']);
      yield* this.#reportStructuralError(
        path.map((entry) => entry.module),
        new DependencyCycleError({ path }),
      );
      path.forEach((entry) => this.#ctx.structurallyFailed.add(entry.module));
    });
  }

  #activateModulesForEvent(
    key: string,
    modules: Plugin.PluginModule[],
    opts?: { suppressEventMessage?: boolean },
  ): Effect.Effect<boolean, Error> {
    const activatingModuleIds = modules.map((module) => module.id);
    return Effect.gen(this, function* () {
      yield* Ref.update(this.#activatingModules, (activating) => Array.appendAll(activating, activatingModuleIds));

      log('activation wave', { event: key, modules: activatingModuleIds });
      performance.mark(`event:${key}:start`);
      yield* this.#ctx.publish({ event: key, state: 'activating' });

      // Same-event provider/consumer pairs are topologically ordered with per-module
      // contribution via the capability-graph machinery.
      yield* this.runDependencyPass({ candidateModules: modules });

      this.#ctx.eventsFired.latch(key);

      performance.mark(`event:${key}:end`);
      performance.measure(`event:${key}`, `event:${key}:start`, `event:${key}:end`);
      // `start()` suppresses the event-level message for Startup and publishes it itself
      // once the concurrent dependency pass has also completed (the useApp ready gate).
      if (!opts?.suppressEventMessage) {
        yield* this.#ctx.publish({ event: key, state: 'activated' });
      }
      log('activated', { key });

      return true;
    }).pipe(
      Effect.ensuring(
        Ref.update(this.#activatingModules, (activating) =>
          Array.filter(activating, (module) => !activatingModuleIds.includes(module)),
        ),
      ),
    );
  }

  #getModulesForActivation(
    key: string,
    activatingEvents: string[],
    activatingModules: string[],
  ): Plugin.PluginModule[] {
    return this.#ctx.getInactiveModulesByEvent(key).filter((module) => {
      const spec = module.activation;
      if (spec.mode === 'dependency') {
        return false;
      }
      const allOf = ActivationEvent.isAllOf(spec.activatesOn);
      if (!allOf) {
        return true;
      }

      // Check to see if all of the events in the `allOf` have been fired.
      // An event can be considered "fired" if it is in the `eventsFired` list or if it is currently being activated.
      const events = ActivationEvent.getEvents(spec.activatesOn).filter(
        (event) => ActivationEvent.eventKey(event) !== key,
      );
      return (
        events.every(
          (event) =>
            this.#ctx.eventsFired.has(ActivationEvent.eventKey(event)) ||
            activatingEvents.includes(ActivationEvent.eventKey(event)),
        ) && !activatingModules.includes(module.id)
      );
    });
  }

  /**
   * Records a structural dependency-graph error against a plugin and publishes it on the
   * activation stream (so boot UIs surface it) without aborting the pass.
   */
  #reportStructuralError(moduleIds: string[], error: Error): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      log.error('dependency graph error', { error: String(error), modules: moduleIds });
      const plugins = new Set<string>();
      for (const moduleId of moduleIds) {
        const pluginId = this.#ctx.getPluginIdForModule(moduleId);
        if (pluginId !== undefined) {
          plugins.add(pluginId);
        }
      }
      plugins.forEach((pluginId) => this.#ctx.recordFailure(pluginId, error));
      yield* this.#ctx.publish({
        event: ActivationEvent.eventKey(ActivationEvent.Startup),
        state: 'error',
        error,
      });
    });
  }

  /**
   * One topological activation round. Returns `undefined` when nothing is runnable.
   */
  #runRound(candidateModules: Plugin.PluginModule[] | undefined): Effect.Effect<boolean | undefined, Error> {
    return Effect.gen(this, function* () {
      const key = ActivationEvent.eventKey(ActivationEvent.Startup);
      const active = this.#ctx.getActive();
      const allModules = this.#ctx.getModules();

      // Event-mode modules join a round once their activation events have fired (latch).
      const eventSatisfied = (module: Plugin.PluginModule): boolean => {
        const spec = module.activation;
        if (spec.mode !== 'event') {
          return false;
        }
        const events = ActivationEvent.getEvents(spec.activatesOn).map(ActivationEvent.eventKey);
        return ActivationEvent.isAllOf(spec.activatesOn)
          ? events.every((event) => this.#ctx.eventsFired.has(event))
          : events.some((event) => this.#ctx.eventsFired.has(event));
      };

      const pendingReactivate = allModules.filter((module) => this.#ctx.pendingReactivate.has(module.id));
      // Explicitly passed candidates are trusted to be triggered (e.g. an event wave passes
      // its matched modules before the event key is latched); pooled candidates require
      // dependency mode or a satisfied event latch.
      const explicit = new Set((candidateModules ?? []).map((module) => module.id));
      const pool = candidateModules ? [...candidateModules, ...pendingReactivate] : allModules;
      const seen = new Set<string>();
      const candidates = pool.filter((module) => {
        if (
          active.includes(module.id) ||
          seen.has(module.id) ||
          this.#ctx.structurallyFailed.has(module.id) ||
          // Already loading via another path (memoized): awaiting it here could deadlock —
          // e.g. a cascade triggered by an event wave that an in-flight module itself fired.
          this.#ctx.loader.isLoading(module.id)
        ) {
          return false;
        }
        if (!explicit.has(module.id) && module.activation.mode === 'event' && !eventSatisfied(module)) {
          return false;
        }
        seen.add(module.id);
        return true;
      });
      if (candidates.length === 0) {
        return undefined;
      }

      // Singleton provider index across candidates and already-active typed modules.
      // The duplicate check spans only modules in play, so mutually-exclusive event-gated
      // alternatives (only one latched) do not trip it. Duplicates put both providers into
      // an error state and exclude them; their dependents pend.
      const providerIndex = new Map<string, string>();
      const structurallyExcluded = new Set<string>();
      const activeTypedModules = allModules.filter((module) => active.includes(module.id));
      for (const module of [...activeTypedModules, ...candidates]) {
        for (const capability of module.activation.provides) {
          if (capability.arity !== 'single') {
            continue;
          }
          const existing = providerIndex.get(capability.identifier);
          if (existing !== undefined && existing !== module.id) {
            const error = new DuplicateProviderError({
              capability: capability.identifier,
              providers: [existing, module.id],
            });
            yield* this.#reportStructuralError([existing, module.id], error);
            structurallyExcluded.add(existing);
            structurallyExcluded.add(module.id);
            this.#ctx.structurallyFailed.add(existing);
            this.#ctx.structurallyFailed.add(module.id);
            providerIndex.delete(capability.identifier);
            continue;
          }
          providerIndex.set(capability.identifier, module.id);
        }
      }

      // Does ANY registered module (active or not, latched or not) provide this?
      const anyRegisteredProvider = (identifier: string): boolean =>
        allModules.some((module) => module.activation.provides.some((provided) => provided.identifier === identifier));

      // Satisfiability fixpoint (pure): everything that pends here is reconsidered by a later
      // cascade round; requires with no possible provider at all are a configuration error
      // recorded against the requiring plugin.
      const { runnable, missing, pended } = ActivationGraph.computeRunnableFixpoint({
        candidates,
        excluded: structurallyExcluded,
        isSatisfied: (capability) => this.#ctx.capabilities.getAll(capability).length > 0,
        providerOf: (identifier) => providerIndex.get(identifier),
        activeIds: [...active],
        anyRegisteredProvider,
      });
      for (const pend of pended) {
        log('module pending on capability', { module: pend.module.id, capability: pend.capability });
      }
      for (const miss of missing) {
        yield* this.#reportStructuralError(
          [miss.module.id],
          new MissingProviderError({
            capability: miss.capability,
            requiredBy: [miss.module.id],
            registered: this.#ctx.capabilities.listRegisteredIdentifiers(),
          }),
        );
        this.#ctx.structurallyFailed.add(miss.module.id);
      }
      if (runnable.length === 0) {
        return undefined;
      }
      runnable.forEach((module) => this.#ctx.pendingReactivate.delete(module.id));

      const graph = ActivationGraph.buildRoundGraph(runnable, {
        isSatisfied: (capability) => this.#ctx.capabilities.getAll(capability).length > 0,
        providerOf: (identifier) => providerIndex.get(identifier),
      });

      const ordered = yield* this.#orderRoundBreakingCycles(graph);
      if (ordered === undefined) {
        return undefined;
      }
      const { waves, cycleFailed } = ordered;
      log('dependency activation waves', {
        waves: waves.map((wave) => wave.map((module) => module.id)),
      });

      return yield* this.#executeWaves(waves, graph, cycleFailed, key);
    });
  }

  /**
   * Orders a round's graph into activation waves, repeatedly excising hard-edge cycles
   * (recorded as an error state on the involved plugins; their dependents skip via the failed
   * set) until the remaining graph is acyclic. Soft edges are then layered best-effort: if they
   * cycle, the round falls back to hard-edge order wholesale. Returns `undefined` when nothing
   * survives cycle excision.
   */
  #orderRoundBreakingCycles(
    graph: ActivationGraph.ActivationGraphModel,
  ): Effect.Effect<{ waves: Plugin.PluginModule[][]; cycleFailed: Set<string> } | undefined, Error> {
    return Effect.gen(this, function* () {
      const cycleFailed = new Set<string>();
      let hardWaves = ActivationGraph.computeActivationWaves(graph, ['hard']);
      while (hardWaves === undefined) {
        const path = ActivationGraph.findCyclePath(graph, ['hard']);
        yield* this.#reportStructuralError(
          path.map((entry) => entry.module),
          new DependencyCycleError({ path }),
        );
        const members = path.map((entry) => entry.module);
        members.forEach((member) => {
          cycleFailed.add(member);
          this.#ctx.structurallyFailed.add(member);
        });
        graph.removeNodes(members);
        if (graph.nodes.length === 0) {
          return undefined;
        }
        hardWaves = ActivationGraph.computeActivationWaves(graph, ['hard']);
      }

      const combinedWaves = ActivationGraph.computeActivationWaves(graph, ['hard', 'soft']);
      if (combinedWaves === undefined && ActivationGraph.hasSoftEdges(graph)) {
        log('multi-capability soft ordering dropped (cycle)', { modules: graph.nodes.map((node) => node.id) });
      }
      return { waves: combinedWaves ?? hardWaves, cycleFailed };
    });
  }

  /**
   * Activates a round wave by wave (modules within a wave run concurrently). A module whose
   * hard-edge provider failed is skipped and marked failed so its own dependents skip too;
   * independent modules proceed. Cycle members arrive pre-failed so their dependents skip as
   * well. Returns whether every module in the round activated.
   */
  #executeWaves(
    waves: Plugin.PluginModule[][],
    graph: ActivationGraph.ActivationGraphModel,
    preFailed: Set<string>,
    key: string,
  ): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const failed = new Set<string>(preFailed);
      const providersOf = (moduleId: string): string[] => ActivationGraph.hardProviderIds(graph, moduleId);
      let allSucceeded = true;
      for (const wave of waves) {
        yield* Effect.all(
          wave.map((module) =>
            Effect.gen(this, function* () {
              if (providersOf(module.id).some((provider) => failed.has(provider))) {
                log.warn('skipping module: provider failed', { module: module.id });
                failed.add(module.id);
                allSucceeded = false;
                return;
              }
              const result = yield* this.#activateModule(module, key).pipe(Effect.either);
              if (result._tag === 'Left') {
                failed.add(module.id);
                allSucceeded = false;
              }
            }),
          ),
          { concurrency: 'unbounded' },
        );
      }
      return allSucceeded;
    });
  }

  /**
   * Loads and contributes a single dependency-mode module. Contribution happens as the module
   * completes (not batched per wave), so singleton gating is exactly wave ordering.
   */
  #activateModule(module: Plugin.PluginModule, parentEvent: string): Effect.Effect<void, Error> {
    return Effect.gen(this, function* () {
      if (this.#ctx.getActive().includes(module.id)) {
        return;
      }
      const capabilities = yield* this.#ctx.loader.load(module, parentEvent);
      yield* this.#ctx.loader.contribute(module, capabilities);
    });
  }

  /**
   * Activates the inactive dependency-mode providers (transitively) of the given modules'
   * unsatisfied singleton requires, plus any inactive dependency-mode providers of their
   * multi requires. Used before running event-mode modules so their requires resolve on
   * demand.
   *
   * Multi requires never gate (they resolve to whatever is currently contributed), but a
   * pulled provider that takes a one-shot snapshot of a multi capability (e.g. the process
   * manager's `Capabilities.LayerSpec` collection) needs its fellow multi providers activated
   * in the *same* scoped round so the round's soft-edge ordering can land them first —
   * otherwise a narrow pull (this provider alone) skips that ordering entirely and the
   * snapshot can be taken before sibling providers have contributed.
   */
  #pullDependencyProviders(modules: Plugin.PluginModule[]): Effect.Effect<void, Error> {
    return Effect.gen(this, function* () {
      const active = this.#ctx.getActive();
      const allModules = this.#ctx.getModules();
      const providerIndex = new Map<string, Plugin.PluginModule>();
      const multiProviderIndex = new Map<string, Plugin.PluginModule[]>();
      for (const module of allModules) {
        if (module.activation.mode !== 'dependency' || active.includes(module.id)) {
          continue;
        }
        for (const capability of module.activation.provides) {
          if (capability.arity === 'single') {
            if (!providerIndex.has(capability.identifier)) {
              providerIndex.set(capability.identifier, module);
            }
          } else {
            const providers = multiProviderIndex.get(capability.identifier) ?? [];
            providers.push(module);
            multiProviderIndex.set(capability.identifier, providers);
          }
        }
      }
      if (providerIndex.size === 0 && multiProviderIndex.size === 0) {
        return;
      }

      const needed = new Map<string, Plugin.PluginModule>();
      const visit = (requires: readonly Capability.AnyTag[]) => {
        for (const capability of requires) {
          if (capability.arity === 'multi') {
            for (const provider of multiProviderIndex.get(capability.identifier) ?? []) {
              if (!needed.has(provider.id)) {
                needed.set(provider.id, provider);
                visit(provider.activation.requires);
              }
            }
            continue;
          }
          if (this.#ctx.capabilities.getAll(capability).length > 0) {
            continue;
          }
          const provider = providerIndex.get(capability.identifier);
          if (provider && !needed.has(provider.id)) {
            needed.set(provider.id, provider);
            if (provider.activation.mode === 'dependency') {
              visit(provider.activation.requires);
            }
          }
        }
      };
      for (const module of modules) {
        visit(module.activation.requires);
      }

      if (needed.size > 0) {
        log('pulling dependency providers', { modules: [...needed.keys()] });
        yield* this.runDependencyPass({ candidateModules: [...needed.values()] });
      }
    });
  }
}
