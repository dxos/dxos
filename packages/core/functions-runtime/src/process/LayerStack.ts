import { Effect, Context, ManagedRuntime, type Scope, Layer, Option } from 'effect';

import { ServiceNotAvailableError, ServiceResolver, type LayerSpec } from '@dxos/functions';
import { assertArgument } from '@dxos/invariant';

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

  async destroy() {}

  #resolveService(
    tag: Context.Tag<any, any>,
    context: LayerSpec.LayerContext,
  ): Effect.Effect<unknown, ServiceNotAvailableError, Scope.Scope> {
    return Effect.gen(this, function* () {
      // Initialise slices top-down (dependencies first) so that higher-affinity slices
      // can use the services provided by lower-affinity ones.
      yield* this.#getOrInitSlice('application', contextForAffinity('application', context));

      if (context.space) {
        yield* this.#getOrInitSlice('space', contextForAffinity('space', context));
      }

      // Only init a process slice if we actually have process context.
      const topAffinity: LayerSpec.Affinity = context.process
        ? 'process'
        : context.space
          ? 'space'
          : 'application';

      if (topAffinity === 'process') {
        yield* this.#getOrInitSlice('process', contextForAffinity('process', context));
      }

      const services = this.#resolveServices(topAffinity, context, [tag]);
      return yield* Context.getOption(services, tag).pipe(
        Effect.catchTag('NoSuchElementException', () => Effect.fail(new ServiceNotAvailableError(tag.key))),
      );
    }).pipe(this.#semapphore.withPermits(1));
  }

  #getOrInitSlice(
    affinity: LayerSpec.Affinity,
    context: LayerSpec.LayerContext,
  ): Effect.Effect<Slice, never, Scope.Scope> {
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
        const requirements = resolveAffinity
          ? this.#resolveServices(resolveAffinity, context, newSlice.requires)
          : Context.empty();
        yield* newSlice.init(requirements as Context.Context<unknown>);
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

  #managedRuntime?: ManagedRuntime.ManagedRuntime<any, any> = undefined;

  #services: Context.Context<unknown> = Context.empty() as Context.Context<unknown>;

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

    this.#sortLayers();
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

  get services(): Context.Context<unknown> {
    return this.#services;
  }

  incrementRefCount() {
    this.#refCount++;
  }

  decrementRefCount() {
    this.#refCount--;
  }

  init(requirements: Context.Context<unknown>): Effect.Effect<void> {
    if (!this.#requires.every((id) => Context.getOption(requirements, id).pipe(Option.isSome))) {
      throw new Error('Requirements not satisfied');
    }

    // Layers are already topologically sorted so dependencies come before dependants.
    // Fold them left-to-right with `provideMerge` so that each subsequent layer can see the
    // services provided by the previous ones (and externally-supplied `requirements`).
    const baseLayer: Layer.Layer<unknown, unknown, unknown> = Layer.syncContext(() => requirements) as any;
    const combinedLayer = this.#layers.reduce<Layer.Layer<unknown, unknown, unknown>>(
      (acc, spec) => Layer.provideMerge(spec.make(this.#context) as Layer.Layer<unknown, unknown, unknown>, acc),
      baseLayer,
    );

    this.#managedRuntime = ManagedRuntime.make(combinedLayer);

    return Effect.gen(this, function* () {
      const rt = yield* this.#managedRuntime!.runtimeEffect;
      this.#services = yield* Effect.context().pipe(Effect.map(Context.pick(...this.#provides)), Effect.provide(rt));
    }).pipe(Effect.orDie);
  }

  async destroy() {
    if (this.#managedRuntime) {
      await this.#managedRuntime.dispose();
    }
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
        throw new Error('Cycle in layer dependency graph (requires / provides)');
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
