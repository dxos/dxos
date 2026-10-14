//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import type * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as Tracer from 'effect/Tracer';

import type * as LayerSpec from '@dxos/compute/LayerSpec';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as SpanAttributes from '@dxos/effect/SpanAttributes';
import { assertArgument } from '@dxos/invariant';
import { log } from '@dxos/log';

import { LayerDependencyCycleError } from './errors.ts';

interface LayerStackOpts {
  readonly layers: LayerSpec.LayerSpec[];

  /**
   * Services the embedder supplies, available to every slice as if a lower-affinity one provided
   * them: a spec may `require` them, and a spec whose ambient requirement is absent is pruned like
   * any other. The lowest slice has no slice below it, so this is the only way into it.
   */
  readonly services?: Context.Context<never>;
}

/**
 * Runs every teardown before re-emitting the first failure. The caller has already taken the
 * resources off its list, so stopping at the first failure would strand the rest with nothing left
 * holding a reference to retry them.
 */
const destroyAll = (teardowns: readonly Effect.Effect<void>[]): Effect.Effect<void> =>
  Effect.gen(function* () {
    let failure: Exit.Exit<void> | undefined;
    for (const teardown of teardowns) {
      const exit = yield* Effect.exit(teardown);
      if (Exit.isFailure(exit)) {
        failure ??= exit;
      }
    }
    if (failure) {
      return yield* failure;
    }
  });

/**
 * Tag for a built {@link LayerStack}.
 */
export class Service extends Context.Service<Service, LayerStack>()('@dxos/compute-runtime/LayerStack') {}

/**
 * A {@link LayerStack} whose ambient services are declared as tags rather than handed over as an
 * opaque {@link Context.Context}: the returned layer requires exactly those tags, so an embedder
 * that fails to provide one is a compile error rather than a spec silently pruned at runtime.
 *
 * Provides the stack's {@link ServiceResolver.ServiceResolver} alongside it, so a consumer can
 * `ServiceResolver.resolve` a tag without reaching through the stack for its resolver.
 *
 * The stack is destroyed when the layer's scope closes.
 */
export const layer = <const Tags extends readonly Context.Key<any, any>[]>(opts: {
  readonly layers: LayerSpec.LayerSpec[];
  readonly services: Tags;
}): Layer.Layer<Service | ServiceResolver.ServiceResolver, never, Context.Service.Identifier<Tags[number]>> =>
  Layer.effectContext(
    Effect.gen(function* () {
      const context = yield* Effect.context<Context.Service.Identifier<Tags[number]>>();
      const stack = new LayerStack({
        layers: opts.layers,
        // Narrowed to the declared tags so the stack sees what the type promised and nothing else.
        services: context.pipe(Context.pick(...opts.services)),
      });
      yield* Effect.addFinalizer(() => stack.destroy());
      return Context.make(Service, stack).pipe(
        Context.add(ServiceResolver.ServiceResolver, stack.getServiceResolver()),
      );
    }),
  );

export class LayerStack {
  #slices: Slice[] = [];
  #semapphore = Effect.runSync(Semaphore.make(1));
  #layers: LayerSpec.LayerSpec[];
  /** Ambient services; `Context` is contravariant, so the internal view is the widened one. */
  #services: Context.Context<unknown>;

  constructor(opts: LayerStackOpts) {
    // Copied because {@link addLayers} appends, and the caller's array is not ours to mutate.
    this.#layers = [...opts.layers];
    this.#services = (opts.services ?? Context.empty()) as Context.Context<unknown>;
  }

  /**
   * Add specs to a live stack, e.g. those of a plugin enabled after boot.
   *
   * Slices that are already built are extended rather than rebuilt, so the services they hold
   * stay live: each one folds the new specs in on its next resolution, re-resolving any new
   * requirement from the slices below it and re-admitting a spec that was pruned only because
   * its dependency had not been contributed yet. Specs already in the stack are ignored.
   *
   * @throws {LayerDependencyCycleError} if the specs would close a requires/provides cycle; the
   *   stack is left unchanged.
   */
  addLayers(layers: readonly LayerSpec.LayerSpec[]): void {
    const added = [...new Set(layers)].filter((layer) => !this.#layers.includes(layer));
    if (added.length === 0) {
      return;
    }

    // Checked before anything is committed, so a bad contribution cannot poison slices built later.
    for (const affinity of new Set(added.map((layer) => layer.affinity))) {
      sortLayers([...this.#layers, ...added].filter((layer) => layer.affinity === affinity));
    }

    this.#layers.push(...added);
    for (const slice of this.#slices) {
      slice.addLayers(added.filter((layer) => layer.affinity === slice.affinity));
    }
  }

  /**
   * Initialise the slice for `context` without asking for a tag, which builds its eager specs.
   * A stack whose point is its side effects — rpc registrations, lifecycle subscriptions — has
   * nothing to resolve, so this is how an embedder starts it.
   */
  init(
    context: LayerSpec.LayerContext = {},
  ): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError, Scope.Scope> {
    return this.#getOrInitSlice('application', contextForAffinity('application', context)).pipe(
      Effect.catchTag('LayerDependencyCycleError', (err) => Effect.die(err)),
      Effect.asVoid,
    );
  }

  getServiceResolver(): ServiceResolver.ServiceResolver {
    return ServiceResolver.make((tag, context) => this.#resolveService(tag, context) as any);
  }

  /**
   * Dispose every cached slice (including keep-alive application/space slices)
   * so their `ManagedRuntime` finalizers run. Slices are torn down in reverse
   * insertion order so higher-affinity slices dispose before the lower-affinity
   * ones they depend on.
   */
  destroy(): Effect.Effect<void> {
    return Effect.suspend(() =>
      destroyAll(
        this.#slices
          .splice(0)
          .reverse()
          .map((slice) => slice.destroy()),
      ),
    );
  }

  #resolveService(
    tag: Context.Key<any, any>,
    context: LayerSpec.LayerContext,
  ): Effect.Effect<unknown, ServiceResolver.ServiceNotAvailableError, Scope.Scope> {
    // Cycle errors from slice initialisation are a configuration bug, not a
    // recoverable resolver failure; surface them as defects so the typed error
    // channel stays narrowed to `ServiceNotAvailableError`.
    return this.#resolveServiceInner(tag, context).pipe(
      Effect.catchTag('LayerDependencyCycleError', (err) => Effect.die(err)),
    );
  }

  #resolveServiceInner(
    tag: Context.Key<any, any>,
    context: LayerSpec.LayerContext,
  ): Effect.Effect<unknown, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError, Scope.Scope> {
    return Effect.gen({ self: this }, function* () {
      // Initialise slices top-down (dependencies first) so that higher-affinity slices
      // can use the services provided by lower-affinity ones.
      yield* this.#getOrInitSlice('application', contextForAffinity('application', context));

      if (context.space) {
        yield* this.#getOrInitSlice('space', contextForAffinity('space', context));
      }

      // Only init a process slice if we actually have process context.
      const topAffinity: LayerSpec.Affinity = context.process ? 'process' : context.space ? 'space' : 'application';

      if (topAffinity === 'process') {
        yield* this.#getOrInitSlice('process', contextForAffinity('process', context));
      }

      yield* this.#materializeTag(tag, context, topAffinity);

      const services = this.#resolveServices(topAffinity, context, [tag]);
      const service = Context.getOption(services, tag).pipe(
        Option.orElse(() => Context.getOption(this.#services, tag)),
      );
      if (Option.isNone(service)) {
        return yield* Effect.fail(
          new ServiceResolver.ServiceNotAvailableError(tag.key, {
            message: this.#formatMissingServiceMessage(tag.key, topAffinity, context),
          }),
        );
      }
      return service.value;
    });
  }

  #getOrInitSlice(
    affinity: LayerSpec.Affinity,
    context: LayerSpec.LayerContext,
  ): Effect.Effect<Slice, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError, Scope.Scope> {
    return Effect.gen({ self: this }, function* () {
      const target = this.#findOrRegisterSlice(affinity, context);
      target.incrementRefCount();
      yield* Effect.addFinalizer(() =>
        Effect.gen({ self: this }, function* () {
          target.decrementRefCount();
          yield* this.#maybeDestroySlice(target);
        }),
      );

      if (target.needsInit) {
        // Captured with `requires` (before any yield), so specs added while the requirements
        // resolve leave the slice stale for the next caller instead of being pruned unseen.
        const revision = target.revision;
        const resolveAffinity = lowerAffinity(affinity);
        if (resolveAffinity) {
          yield* this.#materializeTags(resolveAffinity, context, target.requires);
        }
        const requirements = resolveAffinity
          ? Context.merge(this.#services, this.#resolveServices(resolveAffinity, context, target.requires))
          : this.#services;
        yield* target.initOnce(requirements, revision).pipe(
          Effect.tapCauseIf(isInitFailure, (cause) =>
            Effect.sync(() => {
              const failure = Cause.findErrorOption(cause);
              const missingKey =
                Option.isSome(failure) && failure.value._tag === 'ServiceNotAvailable'
                  ? (failure.value.context as { service?: string }).service
                  : undefined;
              const offendingLayers = missingKey
                ? target.layers
                    .filter((l) => l.requires.some((r) => r.key === missingKey))
                    .map((l) => ({ provides: l.provides.map((p) => p.key), requires: l.requires.map((r) => r.key) }))
                : undefined;
              log.error('LayerStack slice init failed', {
                affinity,
                context,
                missingKey,
                offendingLayers,
                cause: Cause.pretty(cause),
              });
            }),
          ),
        );
      }
      // Eager specs have no tag anyone asks for, so the slice builds them itself once its
      // requirements are in place.
      yield* target.materializeEager();
      return target;
    });
  }

  #findOrRegisterSlice(affinity: LayerSpec.Affinity, context: LayerSpec.LayerContext): Slice {
    const existing = this.#slices.find((s) => s.affinity === affinity && layerContextEquals(s.context, context));
    if (existing) {
      return existing;
    }
    const slice = new Slice({
      affinity,
      context,
      keepAlive: affinity === 'application' || affinity === 'space',
      layers: this.#layers.filter((l) => l.affinity === affinity),
    });
    this.#slices.push(slice);
    return slice;
  }

  #resolveServices(
    affinity: LayerSpec.Affinity,
    context: LayerSpec.LayerContext,
    tags: Context.Key<any, any>[],
  ): Context.Context<unknown> {
    let currentAffinity: LayerSpec.Affinity | undefined = affinity,
      resolved: Context.Context<unknown> = Context.empty() as Context.Context<unknown>,
      tagsNeeded = new Set(tags);

    while (currentAffinity) {
      const affinityContext = contextForAffinity(currentAffinity, context);
      const slice = this.#slices.find(
        (s) => s.affinity === currentAffinity && layerContextEquals(s.context, affinityContext),
      );
      if (slice) {
        const availableTags = [...tagsNeeded].filter((t) => slice.provides.some((p) => p.key === t.key));
        resolved = Context.merge(resolved, slice.services.pipe(Context.pick(...availableTags)));
        availableTags.forEach((t) => tagsNeeded.delete(t));
      }
      currentAffinity = lowerAffinity(currentAffinity);
    }

    return resolved;
  }

  #materializeTag(
    tag: Context.Key<any, any>,
    context: LayerSpec.LayerContext,
    topAffinity: LayerSpec.Affinity,
  ): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError, Scope.Scope> {
    return this.#materializeTags(topAffinity, context, [tag]);
  }

  #materializeTags(
    affinity: LayerSpec.Affinity,
    context: LayerSpec.LayerContext,
    tags: Context.Key<any, any>[],
  ): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError, Scope.Scope> {
    return Effect.gen({ self: this }, function* () {
      let currentAffinity: LayerSpec.Affinity | undefined = affinity;
      while (currentAffinity) {
        const affinityContext = contextForAffinity(currentAffinity, context);
        const slice = this.#slices.find(
          (s) => s.affinity === currentAffinity && layerContextEquals(s.context, affinityContext),
        );
        if (slice) {
          const pending = tags.filter((tag) => slice.provides.some((p) => p.key === tag.key));
          if (pending.length > 0) {
            yield* slice.materialize(pending);
          }
        }
        currentAffinity = lowerAffinity(currentAffinity);
      }
    });
  }

  #maybeDestroySlice(slice: Slice) {
    return Effect.gen({ self: this }, function* () {
      if (slice.refCount === 0 && !slice.keepAlive) {
        const index = this.#slices.indexOf(slice);
        if (index !== -1) {
          this.#slices.splice(index, 1);
        }
        yield* slice.destroy();
      }
    }).pipe(this.#semapphore.withPermits(1));
  }

  #formatMissingServiceMessage(
    tagKey: string,
    topAffinity: LayerSpec.Affinity,
    context: LayerSpec.LayerContext,
  ): string {
    const contextSummary = [
      context.space !== undefined ? `space=${context.space}` : 'space=<missing>',
      context.conversation !== undefined ? `conversation=${context.conversation}` : 'conversation=<missing>',
      context.process !== undefined ? `process=${context.process}` : 'process=<missing>',
    ].join(', ');

    const hints: string[] = [];

    if (context.space === undefined && this.#layers.some((l) => l.affinity === 'space' || l.affinity === 'process')) {
      hints.push('spawn environment is missing `space` (required for space/process-affinity services)');
    }
    if (
      context.conversation === undefined &&
      this.#layers.some((l) => l.provides.some((p) => p.key === tagKey) && l.affinity === 'process')
    ) {
      hints.push(
        'spawn environment is missing `conversation` (set via Operation.withInvocationOptions or ProcessManager.spawn)',
      );
    }

    for (const affinity of ['application', 'space', 'process'] as const) {
      const affinityContext = contextForAffinity(affinity, context);
      const slice = this.#slices.find((s) => s.affinity === affinity && layerContextEquals(s.context, affinityContext));
      if (!slice) {
        continue;
      }
      const pruned = slice.droppedProvidersFor(tagKey);
      if (pruned.length > 0) {
        const missingDeps = [...new Set(pruned.flatMap((spec) => spec.missing))].join(', ');
        hints.push(`${affinity} provider spec pruned due to missing deps: ${missingDeps}`);
      }
    }

    const providers = this.#layers.filter((l) => l.provides.some((p) => p.key === tagKey));
    if (providers.length === 0) {
      hints.push(
        'no LayerSpec contributes this service, and the embedder did not supply it ambiently — is the providing plugin activated on SetupProcessManager?',
      );
    } else if (hints.length === 0) {
      const affinities = [...new Set(providers.map((l) => l.affinity))].join(', ');
      hints.push(`registered at affinity=[${affinities}] but not resolved in current context`);
    }

    const hint = hints.length > 0 ? ` — ${hints.join('; ')}` : '';
    return `Service not available: ${tagKey} (affinity=${topAffinity}) [${contextSummary}]${hint}`;
  }
}

const lowerAffinity = (affinity: LayerSpec.Affinity): LayerSpec.Affinity | undefined => {
  switch (affinity) {
    case 'process':
      return 'space';
    case 'space':
      return 'application';
    default:
      return undefined;
  }
};

const contextForAffinity = (affinity: LayerSpec.Affinity, context: LayerSpec.LayerContext): LayerSpec.LayerContext => {
  switch (affinity) {
    case 'application':
      return {};
    case 'space':
      return {
        space: context.space,
      };
    case 'process':
      return context;
  }
};

/**
 * Shallow structural equality over the fields of {@link LayerSpec.LayerContext}.
 * Plain objects don't participate in Effect's {@link Equal.equals}, so we compare field-by-field.
 */
const layerContextEquals = (a: LayerSpec.LayerContext, b: LayerSpec.LayerContext): boolean =>
  a.space === b.space && a.conversation === b.conversation && a.process === b.process;

interface SliceOpts {
  readonly affinity: LayerSpec.Affinity;
  readonly context: LayerSpec.LayerContext;
  readonly keepAlive: boolean;
  readonly layers: LayerSpec.LayerSpec[];
}

const isInitFailure = <E>(cause: Cause.Cause<E>): boolean => !Cause.hasInterruptsOnly(cause);

/**
 * Collection of layers of a specific affinity.
 */
class Slice {
  #affinity: LayerSpec.Affinity;
  #context: LayerSpec.LayerContext;
  #keepAlive: boolean;
  #refCount: number = 0;
  /**
   * Every spec assigned to the slice, in topological order, including those pruned at init.
   */
  #allLayers: LayerSpec.LayerSpec[];
  /**
   * The specs that survived pruning (all of them until the slice is initialized).
   */
  #layers: LayerSpec.LayerSpec[];
  /**
   * Requirements that are not satisfied by the layers in the slice.
   */
  #requires: Context.Key<any, any>[] = [];
  /**
   * Everything that all the layers in the slice provide.
   */
  #provides: Context.Key<any, any>[] = [];

  /**
   * Specs that were dropped during {@link init} because their `requires` could not be
   * satisfied. Indexed by each tag they would have provided, so resolve-time failures can
   * surface the upstream missing dependency in the error message.
   */
  #droppedProviders: Map<string, { provides: readonly string[]; missing: readonly string[] }[]> = new Map();

  /**
   * Externally supplied services from lower-affinity slices, set during {@link init}.
   */
  #requirements: Context.Context<unknown> = Context.empty() as Context.Context<unknown>;

  /**
   * Layer specs whose factories have been executed for this slice.
   */
  #materializedLayers: LayerSpec.LayerSpec[] = [];

  /**
   * One managed runtime per incremental materialisation batch. Kept alive so scoped
   * services from earlier batches are not torn down when a new tag is materialised.
   */
  #managedRuntimes: ManagedRuntime.ManagedRuntime<any, any>[] = [];

  #services: Context.Context<unknown> = Context.empty() as Context.Context<unknown>;

  #sortError: LayerDependencyCycleError | undefined;

  readonly #buildLock = Effect.runSync(Semaphore.make(1));
  #initialized = false;
  /** Bumped by {@link addLayers}; the slice is stale while it is ahead of {@link #appliedRevision}. */
  #revision = 0;
  #appliedRevision = -1;

  constructor(opts: SliceOpts) {
    this.#affinity = opts.affinity;
    this.#context = opts.context;
    this.#keepAlive = opts.keepAlive;
    this.#allLayers = opts.layers;
    this.#layers = opts.layers;

    switch (opts.affinity) {
      case 'application':
        assertArgument(opts.context.process === undefined, 'process context is not allowed for application affinity');
        assertArgument(opts.context.space === undefined, 'space context is not allowed for application affinity');
        assertArgument(
          opts.context.conversation === undefined,
          'space context is not allowed for application affinity',
        );
        break;
      case 'space':
        assertArgument(opts.context.process === undefined, 'process context is not allowed for application affinity');
        assertArgument(
          opts.context.conversation === undefined,
          'space context is not allowed for application affinity',
        );
        assertArgument(opts.context.space !== undefined, 'space context is required for space affinity');
        break;
    }

    // Eagerly compute the topological sort so that `requires`/`provides` are
    // populated for dependency resolution. A cycle is remembered and surfaced
    // through the Effect error channel when `init()` runs.
    try {
      this.#sortLayers();
    } catch (err) {
      if (err instanceof LayerDependencyCycleError) {
        this.#sortError = err;
      } else {
        throw err;
      }
    }
  }

  /**
   * Assign more specs to the slice. A built slice keeps its services and folds the specs in on its
   * next {@link initOnce}, which the owning stack triggers through {@link needsInit}.
   */
  addLayers(layers: readonly LayerSpec.LayerSpec[]): void {
    const added = layers.filter((layer) => !this.#allLayers.includes(layer));
    if (added.length === 0) {
      return;
    }
    this.#allLayers = [...this.#allLayers, ...added];
    this.#revision++;
    try {
      this.#sortLayers();
    } catch (err) {
      if (err instanceof LayerDependencyCycleError) {
        this.#sortError = err;
      } else {
        throw err;
      }
    }
  }

  get affinity(): LayerSpec.Affinity {
    return this.#affinity;
  }

  get context(): LayerSpec.LayerContext {
    return this.#context;
  }

  get keepAlive(): boolean {
    return this.#keepAlive;
  }

  get refCount(): number {
    return this.#refCount;
  }

  get provides(): Context.Key<any, any>[] {
    return this.#provides;
  }

  get requires(): Context.Key<any, any>[] {
    return this.#requires;
  }

  get layers(): readonly LayerSpec.LayerSpec[] {
    return this.#layers;
  }

  /**
   * Specs that previously offered `tagKey` but were dropped at slice init. Empty if no spec
   * ever advertised the tag at this affinity, or if all such specs survived pruning.
   */
  droppedProvidersFor(tagKey: string): ReadonlyArray<{ provides: readonly string[]; missing: readonly string[] }> {
    return this.#droppedProviders.get(tagKey) ?? [];
  }

  get services(): Context.Context<unknown> {
    return this.#services;
  }

  incrementRefCount() {
    this.#refCount++;
  }

  decrementRefCount() {
    this.#refCount--;
  }

  init(
    requirements: Context.Context<unknown>,
  ): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError> {
    if (this.#sortError) {
      return Effect.fail(this.#sortError);
    }

    this.#prune(requirements);
    this.#requirements = requirements;
    // A spec in this slice outranks the same tag from below, as a higher slice's would; leaving it in
    // would mark the tag built and the spec would never run.
    this.#services = this.#withoutOwnProvides(requirements);
    this.#materializedLayers = [];
    this.#managedRuntimes = [];

    return Effect.void;
  }

  /**
   * Re-prunes a built slice after {@link addLayers}, keeping every service it already holds:
   * `requirements` only adds the lower-affinity services the new specs need.
   */
  #extend(
    requirements: Context.Context<unknown>,
  ): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError> {
    if (this.#sortError) {
      return Effect.fail(this.#sortError);
    }

    const merged = Context.merge(this.#requirements, requirements);
    this.#prune(merged);
    this.#requirements = merged;
    // Existing entries win, so a service already handed out is never swapped underneath its users.
    this.#services = Context.merge(this.#withoutOwnProvides(requirements), this.#services);

    return Effect.void;
  }

  /** `services` without the tags a surviving spec of this slice provides. */
  #withoutOwnProvides(services: Context.Context<unknown>): Context.Context<unknown> {
    const own = new Set(this.#provides.map((tag) => tag.key));
    return Context.makeUnsafe<unknown>(new Map([...services.mapUnsafe].filter(([key]) => !own.has(key))));
  }

  #prune(requirements: Context.Context<unknown>): void {
    // Per-spec pruning: drop specs whose `requires` aren't satisfied by the
    // parent slice's services (or by surviving earlier specs in this slice).
    // Iterate in topological order so a spec only sees what came before it.
    //
    // The previous behaviour failed the entire slice when ANY spec's
    // requirements were missing — which blew up unrelated tags. Example: a
    // `process`-affinity AiContext spec that requires `Database.Service`
    // would break every spawn without a `space` context (e.g. UI ops like
    // `update-complementary`), because the slice is shared across every
    // process-affinity spec.
    //
    // Now: dropped specs simply don't contribute their tags. Callers asking
    // for those tags fail with a precise `ServiceNotAvailable` at
    // `#resolveService` time (via `Context.getOption` returning `None`),
    // rather than dragging unrelated tags down with them.
    const availableKeys = new Set<string>();
    for (const tag of this.#requires) {
      if (Option.isSome(Context.getOption(requirements, tag))) {
        availableKeys.add(tag.key);
      }
    }
    const survivingLayers: LayerSpec.LayerSpec[] = [];
    const droppedLayers: { provides: string[]; missing: string[] }[] = [];
    this.#droppedProviders.clear();
    for (const layer of this.#allLayers) {
      const missing = layer.requires.filter((r) => !availableKeys.has(r.key));
      // A built spec stays whatever the re-prune says: its services are live and handed out.
      if (missing.length === 0 || this.#materializedLayers.includes(layer)) {
        survivingLayers.push(layer);
        for (const p of layer.provides) {
          availableKeys.add(p.key);
        }
      } else {
        const dropped = {
          provides: layer.provides.map((p) => p.key),
          missing: missing.map((m) => m.key),
        };
        droppedLayers.push(dropped);
        for (const provided of dropped.provides) {
          const bucket = this.#droppedProviders.get(provided) ?? [];
          bucket.push(dropped);
          this.#droppedProviders.set(provided, bucket);
        }
      }
    }
    if (droppedLayers.length > 0) {
      log('pruned layer specs with unsatisfied requirements', {
        affinity: this.#affinity,
        context: this.#context,
        dropped: droppedLayers,
      });
    }
    this.#layers = survivingLayers;
    // Recompute `#provides` so `#resolveServices` advertises only what the
    // surviving layers actually deliver. Tags whose only provider was pruned
    // fall through to the `ServiceNotAvailable` branch in `#resolveService`.
    const provides = new Map<string, Context.Key<any, any>>();
    for (const layer of survivingLayers) {
      for (const p of layer.provides) {
        provides.set(p.key, p);
      }
    }
    this.#provides = [...provides.values()];
  }

  get initialized(): boolean {
    return this.#initialized;
  }

  /** True until the slice is initialized, and again whenever specs were added since. */
  get needsInit(): boolean {
    return !this.#initialized || this.#appliedRevision < this.#revision;
  }

  get revision(): number {
    return this.#revision;
  }

  /**
   * Initializes the slice, or extends it with the specs added since, as of `revision`: the
   * {@link revision} read alongside the {@link requires} that `requirements` was resolved for.
   */
  initOnce(
    requirements: Context.Context<unknown>,
    revision: number,
  ): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError> {
    return this.#buildLock.withPermits(1)(
      Effect.suspend(() => {
        if (this.#initialized && this.#appliedRevision >= revision) {
          return Effect.void;
        }
        return (this.#initialized ? this.#extend(requirements) : this.init(requirements)).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              this.#initialized = true;
              this.#appliedRevision = Math.max(this.#appliedRevision, revision);
            }),
          ),
        );
      }),
    );
  }

  /**
   * Materialises layer specs needed to satisfy `tags`. Specs whose factories were not
   * run yet are merged into the slice runtime on demand so unrelated providers (e.g.
   * conversation-scoped `HarnessService`) do not execute during slice init.
   */
  materialize(
    tags: Context.Key<any, any>[],
  ): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError> {
    return Effect.suspend(() =>
      this.#hasBuilt(tags)
        ? Effect.void
        : this.#buildLock.withPermits(1)(Effect.suspend(() => this.#materializePending(tags))),
    );
  }

  /**
   * Builds every {@link LayerSpec.LayerSpec.eager} spec that survived pruning, with whatever
   * provides its requirements.
   */
  materializeEager(): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError> {
    return Effect.suspend(() => {
      const pending = this.#layers.filter((layer) => layer.eager && !this.#materializedLayers.includes(layer));
      return pending.length === 0
        ? Effect.void
        : this.#buildLock.withPermits(1)(Effect.suspend(() => this.#materializeSpecs(pending)));
    });
  }

  #hasBuilt(tags: Context.Key<any, any>[]): boolean {
    return !this.#sortError && tags.every((tag) => Option.isSome(Context.getOption(this.#services, tag)));
  }

  #materializePending(
    tags: Context.Key<any, any>[],
  ): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError> {
    if (this.#sortError) {
      return Effect.fail(this.#sortError);
    }

    const pendingTags = tags.filter((tag) => Option.isNone(Context.getOption(this.#services, tag)));
    if (pendingTags.length === 0) {
      return Effect.void;
    }

    return this.#materializeSpecs(this.#layersNeededFor(pendingTags));
  }

  /** Builds `specs` and their dependency providers, skipping whatever is already materialized. */
  #materializeSpecs(
    specs: LayerSpec.LayerSpec[],
  ): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError | LayerDependencyCycleError> {
    if (this.#sortError) {
      return Effect.fail(this.#sortError);
    }

    const newLayers = this.#expand(specs).filter((layer) => !this.#materializedLayers.includes(layer));
    if (newLayers.length === 0) {
      return Effect.void;
    }

    return this.#materializeLayers(newLayers).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          for (const layer of newLayers) {
            if (!this.#materializedLayers.includes(layer)) {
              this.#materializedLayers.push(layer);
            }
          }
        }),
      ),
    );
  }

  #layersNeededFor(tags: Context.Key<any, any>[]): LayerSpec.LayerSpec[] {
    return this.#expand(
      this.#layers.filter((layer) => tags.some((tag) => layer.provides.some((provided) => provided.key === tag.key))),
    );
  }

  /** `seed` plus the specs providing their requirements, in slice (topological) order. */
  #expand(seed: LayerSpec.LayerSpec[]): LayerSpec.LayerSpec[] {
    const needed = new Set<LayerSpec.LayerSpec>();
    const availableKeys = this.#availableServiceKeys();

    const addLayer = (layer: LayerSpec.LayerSpec) => {
      if (needed.has(layer)) {
        return;
      }
      needed.add(layer);
      for (const required of layer.requires) {
        if (availableKeys.has(required.key)) {
          continue;
        }
        const provider = this.#layers.find((candidate) =>
          candidate.provides.some((provided) => provided.key === required.key),
        );
        if (provider) {
          addLayer(provider);
        }
      }
    };

    for (const layer of seed) {
      addLayer(layer);
    }

    return this.#layers.filter((layer) => needed.has(layer));
  }

  #availableServiceKeys(): Set<string> {
    const keys = new Set<string>();
    for (const tag of this.#requires) {
      if (Option.isSome(Context.getOption(this.#services, tag))) {
        keys.add(tag.key);
      }
    }
    for (const tag of this.#provides) {
      if (Option.isSome(Context.getOption(this.#services, tag))) {
        keys.add(tag.key);
      }
    }
    return keys;
  }

  #materializeLayers(newLayers: LayerSpec.LayerSpec[]): Effect.Effect<void, ServiceResolver.ServiceNotAvailableError> {
    return Effect.gen({ self: this }, function* () {
      // `ManagedRuntime.make` starts from an empty context, so the slice would otherwise trace to
      // Effect's default, which exports nothing.
      const defaultTracer = Context.make(Tracer.Tracer, yield* Effect.tracer);
      const withDefaultTracer = (services: Context.Context<unknown>) => Context.merge(defaultTracer, services);
      const baseLayer: Layer.Layer<unknown, unknown, unknown> = Layer.syncContext(() =>
        withDefaultTracer(this.#services),
      ) as any;
      const combinedLayer = newLayers.reduce<Layer.Layer<unknown, unknown, unknown>>(
        (acc, spec) => Layer.provideMerge(spec.make(this.#context) as Layer.Layer<unknown, unknown, unknown>, acc),
        baseLayer,
      );

      const runtime = ManagedRuntime.make(combinedLayer as Layer.Layer<unknown, unknown, never>);

      const exit = yield* Effect.gen({ self: this }, function* () {
        const rt = yield* runtime.contextEffect;
        const providedTags = newLayers.flatMap((layer) => layer.provides);
        const materialized = yield* Effect.context().pipe(
          Effect.map(Context.pick(...providedTags)),
          Effect.provide(rt),
        );
        this.#services = Context.merge(this.#services, materialized);
        this.#managedRuntimes.push(runtime);
      }).pipe(Effect.exit);

      if (Exit.isFailure(exit)) {
        yield* Effect.tryPromise(() => runtime.dispose()).pipe(Effect.orDie);
        const failure = Cause.findErrorOption(exit.cause);
        if (Option.isSome(failure) && failure.value instanceof ServiceResolver.ServiceNotAvailableError) {
          return yield* Effect.fail(failure.value);
        }
        const defect = Option.fromNullishOr(exit.cause.reasons.find(Cause.isDieReason)?.defect);
        if (Option.isSome(defect) && defect.value instanceof ServiceResolver.ServiceNotAvailableError) {
          return yield* Effect.fail(defect.value);
        }
        return yield* Effect.fail(
          new ServiceResolver.ServiceNotAvailableError('layer materialization failed', {
            message: `Layer materialization failed: ${Cause.pretty(exit.cause)}`,
          }),
        );
      }
    }).pipe(
      Effect.withSpan('LayerStack.materializeLayers', {
        attributes: {
          [SpanAttributes.LAYER.provides]: newLayers.flatMap((layer) => layer.provides.map((tag) => tag.key)),
        },
      }),
    );
  }

  /**
   * Disposes the batch runtimes newest first: a batch materialized later may hold services from an
   * earlier one, and Effect only orders finalizers within a single runtime.
   */
  destroy(): Effect.Effect<void> {
    return Effect.suspend(() =>
      destroyAll(
        this.#managedRuntimes
          .splice(0)
          .reverse()
          .map((runtime) => Effect.promise(() => runtime.dispose())),
      ),
    );
  }

  #sortLayers() {
    const { sorted, provides, requires } = sortLayers(this.#allLayers);
    this.#allLayers = sorted;
    this.#requires = requires;
    // A built slice advertises only what survived its last prune; the next one recomputes this.
    if (!this.#initialized) {
      this.#layers = sorted;
      this.#provides = provides;
    }
  }
}

/**
 * Topologically sorts `layers` so each spec follows the providers of its requirements, and
 * collects what they provide and what they require from outside the set.
 *
 * @throws {LayerDependencyCycleError} if the requires/provides graph has a cycle.
 */
const sortLayers = (
  layers: readonly LayerSpec.LayerSpec[],
): {
  sorted: LayerSpec.LayerSpec[];
  provides: Context.Key<any, any>[];
  requires: Context.Key<any, any>[];
} => {
  const unique = [...new Set(layers)];

  const providesByKey = new Map<string, Context.Key<any, any>>();
  const requireTagByKey = new Map<string, Context.Key<any, any>>();
  for (const layer of unique) {
    for (const tag of layer.provides) {
      providesByKey.set(tag.key, tag);
    }
    for (const tag of layer.requires) {
      requireTagByKey.set(tag.key, tag);
    }
  }
  const provides = [...providesByKey.values()];
  const requires = [...requireTagByKey].filter(([key]) => !providesByKey.has(key)).map(([, tag]) => tag);

  // Kahn's algorithm, always taking the earliest ready spec so independent specs keep their order.
  const inDegree = new Map<LayerSpec.LayerSpec, number>(unique.map((layer) => [layer, 0]));
  const dependents = new Map<LayerSpec.LayerSpec, LayerSpec.LayerSpec[]>(unique.map((layer) => [layer, []]));
  for (const dependent of unique) {
    for (const provider of unique) {
      if (
        dependent !== provider &&
        dependent.requires.some((required) => provider.provides.some((provided) => provided.key === required.key))
      ) {
        dependents.get(provider)?.push(dependent);
        inDegree.set(dependent, (inDegree.get(dependent) ?? 0) + 1);
      }
    }
  }

  const sorted: LayerSpec.LayerSpec[] = [];
  const remaining = [...unique];
  while (remaining.length > 0) {
    const index = remaining.findIndex((layer) => inDegree.get(layer) === 0);
    if (index === -1) {
      throw new LayerDependencyCycleError({
        message: 'Cycle in layer dependency graph (requires / provides)',
      });
    }
    for (const next of remaining.splice(index, 1)) {
      sorted.push(next);
      for (const dependent of dependents.get(next) ?? []) {
        inDegree.set(dependent, (inDegree.get(dependent) ?? 0) - 1);
      }
    }
  }

  return { sorted, provides, requires };
};
