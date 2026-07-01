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

import { type LayerSpec, ServiceNotAvailableError, ServiceResolver } from '@dxos/compute';
import { assertArgument } from '@dxos/invariant';
import { log } from '@dxos/log';

import { LayerDependencyCycleError } from './errors';

interface LayerStackOpts {
  readonly layers: LayerSpec.LayerSpec[];
}

export class LayerStack {
  #slices: Slice[] = [];
  #semapphore = Effect.runSync(Effect.makeSemaphore(1));
  #layers: LayerSpec.LayerSpec[];

  constructor(opts: LayerStackOpts) {
    this.#layers = opts.layers;
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
  async destroy(): Promise<void> {
    const slices = this.#slices.splice(0).reverse();
    for (const slice of slices) {
      await slice.destroy();
    }
  }

  #resolveService(
    tag: Context.Tag<any, any>,
    context: LayerSpec.LayerContext,
  ): Effect.Effect<unknown, ServiceNotAvailableError, Scope.Scope> {
    // Cycle errors from slice initialisation are a configuration bug, not a
    // recoverable resolver failure; surface them as defects so the typed error
    // channel stays narrowed to `ServiceNotAvailableError`.
    return this.#resolveServiceInner(tag, context).pipe(
      Effect.catchTag('LayerDependencyCycleError', (err) => Effect.die(err)),
    );
  }

  #resolveServiceInner(
    tag: Context.Tag<any, any>,
    context: LayerSpec.LayerContext,
  ): Effect.Effect<unknown, ServiceNotAvailableError | LayerDependencyCycleError, Scope.Scope> {
    return Effect.gen(this, function* () {
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
      const service = Context.getOption(services, tag);
      if (Option.isNone(service)) {
        return yield* Effect.fail(
          new ServiceNotAvailableError(tag.key, {
            message: this.#formatMissingServiceMessage(tag.key, topAffinity, context),
          }),
        );
      }
      return service.value;
    }).pipe(this.#semapphore.withPermits(1));
  }

  #getOrInitSlice(
    affinity: LayerSpec.Affinity,
    context: LayerSpec.LayerContext,
  ): Effect.Effect<Slice, ServiceNotAvailableError | LayerDependencyCycleError, Scope.Scope> {
    return Effect.gen(this, function* () {
      let slice = this.#slices.find((s) => s.affinity === affinity && layerContextEquals(s.context, context));

      if (!slice) {
        const newSlice = new Slice({
          affinity,
          context,
          keepAlive: affinity === 'application' || affinity === 'space',
          layers: this.#layers.filter((l) => l.affinity === affinity),
        });
        const resolveAffinity = lowerAffinity(affinity);
        if (resolveAffinity) {
          yield* this.#materializeTags(resolveAffinity, context, newSlice.requires);
        }
        const requirements = resolveAffinity
          ? this.#resolveServices(resolveAffinity, context, newSlice.requires)
          : Context.empty();
        yield* newSlice.init(requirements as Context.Context<unknown>).pipe(
          Effect.tapErrorCause((cause) =>
            Effect.sync(() => {
              const failure = Cause.failureOption(cause);
              const missingKey =
                Option.isSome(failure) && failure.value._tag === 'ServiceNotAvailable'
                  ? (failure.value.context as { service?: string }).service
                  : undefined;
              const offendingLayers = missingKey
                ? newSlice.layers
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
        this.#slices.push(newSlice);
        slice = newSlice;
      }

      slice.incrementRefCount();
      yield* Effect.addFinalizer(() =>
        Effect.gen(this, function* () {
          slice.decrementRefCount();
          yield* this.#maybeDestroySlice(slice);
        }),
      );
      return slice;
    });
  }

  #resolveServices(
    affinity: LayerSpec.Affinity,
    context: LayerSpec.LayerContext,
    tags: Context.Tag<any, any>[],
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
    tag: Context.Tag<any, any>,
    context: LayerSpec.LayerContext,
    topAffinity: LayerSpec.Affinity,
  ): Effect.Effect<void, ServiceNotAvailableError | LayerDependencyCycleError, Scope.Scope> {
    return this.#materializeTags(topAffinity, context, [tag]);
  }

  #materializeTags(
    affinity: LayerSpec.Affinity,
    context: LayerSpec.LayerContext,
    tags: Context.Tag<any, any>[],
  ): Effect.Effect<void, ServiceNotAvailableError | LayerDependencyCycleError, Scope.Scope> {
    return Effect.gen(this, function* () {
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
    return Effect.gen(this, function* () {
      if (slice.refCount === 0 && !slice.keepAlive) {
        const index = this.#slices.indexOf(slice);
        if (index !== -1) {
          this.#slices.splice(index, 1);
        }
        yield* Effect.promise(() => slice.destroy());
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
      hints.push('no LayerSpec contributes this service — is the providing plugin activated on SetupProcessManager?');
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

/**
 * Collection of layers of a specific affinity.
 */
class Slice {
  #affinity: LayerSpec.Affinity;
  #context: LayerSpec.LayerContext;
  #keepAlive: boolean;
  #refCount: number = 0;
  #layers: LayerSpec.LayerSpec[];
  /**
   * Requirements that are not satisfied by the layers in the slice.
   */
  #requires: Context.Tag<any, any>[] = [];
  /**
   * Everything that all the layers in the slice provide.
   */
  #provides: Context.Tag<any, any>[] = [];

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

  constructor(opts: SliceOpts) {
    this.#affinity = opts.affinity;
    this.#context = opts.context;
    this.#keepAlive = opts.keepAlive;
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

  get provides(): Context.Tag<any, any>[] {
    return this.#provides;
  }

  get requires(): Context.Tag<any, any>[] {
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
  ): Effect.Effect<void, ServiceNotAvailableError | LayerDependencyCycleError> {
    if (this.#sortError) {
      return Effect.fail(this.#sortError);
    }

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
    for (const layer of this.#layers) {
      const missing = layer.requires.filter((r) => !availableKeys.has(r.key));
      if (missing.length === 0) {
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
    const provides = new Map<string, Context.Tag<any, any>>();
    for (const layer of survivingLayers) {
      for (const p of layer.provides) {
        provides.set(p.key, p);
      }
    }
    this.#provides = [...provides.values()];

    this.#requirements = requirements;
    this.#services = requirements;
    this.#materializedLayers = [];
    this.#managedRuntimes = [];

    return Effect.void;
  }

  /**
   * Materialises layer specs needed to satisfy `tags`. Specs whose factories were not
   * run yet are merged into the slice runtime on demand so unrelated providers (e.g.
   * conversation-scoped `HarnessService`) do not execute during slice init.
   */
  materialize(
    tags: Context.Tag<any, any>[],
  ): Effect.Effect<void, ServiceNotAvailableError | LayerDependencyCycleError> {
    if (this.#sortError) {
      return Effect.fail(this.#sortError);
    }

    const pendingTags = tags.filter((tag) => Option.isNone(Context.getOption(this.#services, tag)));
    if (pendingTags.length === 0) {
      return Effect.void;
    }

    const layersToAdd = this.#layersNeededFor(pendingTags);
    if (layersToAdd.length === 0) {
      return Effect.void;
    }

    const newLayers = layersToAdd.filter((layer) => !this.#materializedLayers.includes(layer));
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

  #layersNeededFor(tags: Context.Tag<any, any>[]): LayerSpec.LayerSpec[] {
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

    for (const tag of tags) {
      for (const layer of this.#layers) {
        if (layer.provides.some((provided) => provided.key === tag.key)) {
          addLayer(layer);
        }
      }
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

  #materializeLayers(newLayers: LayerSpec.LayerSpec[]): Effect.Effect<void, ServiceNotAvailableError> {
    return Effect.gen(this, function* () {
      const baseLayer: Layer.Layer<unknown, unknown, unknown> = Layer.syncContext(() => this.#services) as any;
      const combinedLayer = newLayers.reduce<Layer.Layer<unknown, unknown, unknown>>(
        (acc, spec) => Layer.provideMerge(spec.make(this.#context) as Layer.Layer<unknown, unknown, unknown>, acc),
        baseLayer,
      );

      const runtime = ManagedRuntime.make(combinedLayer as Layer.Layer<unknown, unknown, never>);

      const exit = yield* Effect.gen(this, function* () {
        const rt = yield* runtime.runtimeEffect;
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
        const failure = Cause.failureOption(exit.cause);
        if (Option.isSome(failure) && failure.value instanceof ServiceNotAvailableError) {
          return yield* Effect.fail(failure.value);
        }
        const defect = Cause.dieOption(exit.cause);
        if (Option.isSome(defect) && defect.value instanceof ServiceNotAvailableError) {
          return yield* Effect.fail(defect.value);
        }
        return yield* Effect.fail(
          new ServiceNotAvailableError('layer materialization failed', {
            message: `Layer materialization failed: ${Cause.pretty(exit.cause)}`,
          }),
        );
      }
    });
  }

  async destroy() {
    await Promise.all(this.#managedRuntimes.map((runtime) => runtime.dispose()));
    this.#managedRuntimes = [];
  }

  #sortLayers() {
    const layers = this.#layers;
    const n = layers.length;

    const providesByKey = new Map<string, Context.Tag<any, any>>();
    for (const layer of layers) {
      for (const p of layer.provides) {
        providesByKey.set(p.key, p);
      }
    }

    const requireTagByKey = new Map<string, Context.Tag<any, any>>();
    for (const layer of layers) {
      for (const r of layer.requires) {
        requireTagByKey.set(r.key, r);
      }
    }

    this.#provides = [...providesByKey.values()];
    this.#requires = [];
    for (const [key, tag] of requireTagByKey) {
      if (!providesByKey.has(key)) {
        this.#requires.push(tag);
      }
    }

    if (n <= 1) {
      return;
    }

    const inDegree = new Array<number>(n).fill(0);
    const adj: number[][] = Array.from({ length: n }, () => []);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          continue;
        }
        const a = layers[i]!;
        const b = layers[j]!;
        const depends = a.requires.some((req: Context.Tag<any, any>) =>
          b.provides.some((prov: Context.Tag<any, any>) => prov.key === req.key),
        );
        if (depends) {
          adj[j]!.push(i);
          inDegree[i]!++;
        }
      }
    }

    const sorted: number[] = [];
    const placed = new Array<boolean>(n).fill(false);
    for (let k = 0; k < n; k++) {
      let next = -1;
      for (let i = 0; i < n; i++) {
        if (placed[i] || inDegree[i] !== 0) {
          continue;
        }
        next = i;
        break;
      }
      if (next === -1) {
        throw new LayerDependencyCycleError({
          message: 'Cycle in layer dependency graph (requires / provides)',
        });
      }
      sorted.push(next);
      placed[next] = true;
      for (const v of adj[next]!) {
        inDegree[v]!--;
      }
    }

    this.#layers = sorted.map((idx) => layers[idx]!);
  }
}
