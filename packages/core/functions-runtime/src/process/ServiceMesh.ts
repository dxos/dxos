//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as MutableRef from 'effect/MutableRef';
import * as Option from 'effect/Option';
import * as Scope from 'effect/Scope';

import { ServiceNotAvailableError, ServiceResolver } from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import * as LayerSpec from './LayerSpec';

/**
 * Context key for a space-scoped resolution.
 */
export interface SpaceContext {
  readonly space: SpaceId;
}

/**
 * Context key for a process-scoped resolution.
 */
export interface ProcessContext {
  readonly pid: string;
}

/**
 * Resolution context for service mesh.
 */
export type ResolutionContext = {
  readonly space?: SpaceId;
  readonly pid?: string;
};

/**
 * Internal cache key for affinity-based service instances.
 */
type CacheKey = string;

/**
 * Cached layer instance with its scope.
 */
interface CachedInstance {
  readonly context: Context.Context<any>;
  readonly scope: Scope.CloseableScope;
  readonly refCount: MutableRef.MutableRef<number>;
}

/**
 * ServiceMesh manages services with three affinities:
 * - `application` - single instance lives until destroy() is called.
 * - `space` - instance per space, lives until scope on getResolver is closed.
 * - `process` - instance per process, lives until scope on getResolver is closed.
 *
 * Services are lazily loaded and cached based on their affinity.
 * Services within each affinity are topologically sorted by their dependencies.
 */
export class ServiceMesh {
  readonly #layerSpecs: LayerSpec.LayerSpec[] = [];
  readonly #sortedByAffinity = new Map<LayerSpec.Affinity, LayerSpec.LayerSpec[]>();

  /**
   * Application-level cache (lives until destroy).
   */
  readonly #applicationCache = new Map<string, CachedInstance>();

  /**
   * Space-level cache (reference counted, lives until all resolvers are closed).
   */
  readonly #spaceCache = new Map<CacheKey, CachedInstance>();

  /**
   * Process-level cache (reference counted, lives until all resolvers are closed).
   */
  readonly #processCache = new Map<CacheKey, CachedInstance>();

  #destroyed = false;

  constructor(layerSpecs: LayerSpec.LayerSpec[] = []) {
    this.add(layerSpecs);
  }

  /**
   * Add layer specs to the mesh.
   */
  add(layerSpecs: LayerSpec.LayerSpec | LayerSpec.LayerSpec[]): void {
    if (this.#destroyed) {
      throw new Error('ServiceMesh has been destroyed');
    }

    const toAdd = Array.isArray(layerSpecs) ? layerSpecs : [layerSpecs];
    for (const spec of toAdd) {
      if (!this.#layerSpecs.includes(spec)) {
        this.#layerSpecs.push(spec);
      }
    }
    this.#rebuildSortedLayerSpecs();
  }

  /**
   * Remove layer specs from the mesh.
   */
  remove(layerSpecs: LayerSpec.LayerSpec | LayerSpec.LayerSpec[]): void {
    if (this.#destroyed) {
      throw new Error('ServiceMesh has been destroyed');
    }

    const toRemove = Array.isArray(layerSpecs) ? layerSpecs : [layerSpecs];
    for (const spec of toRemove) {
      const index = this.#layerSpecs.indexOf(spec);
      if (index !== -1) {
        this.#layerSpecs.splice(index, 1);
      }
    }
    this.#rebuildSortedLayerSpecs();
  }

  /**
   * Run an effect with a service resolver provided for the given context.
   * The resolver scope is tied to the effect's scope.
   */
  run<A, E, R>(
    effect: Effect.Effect<A, E, R | ServiceResolver.ServiceResolver>,
    context: ResolutionContext = {},
  ): Effect.Effect<A, E, Exclude<R, ServiceResolver.ServiceResolver | Scope.Scope>> {
    return effect.pipe(Effect.provide(this.getResolverLayer(context))) as Effect.Effect<
      A,
      E,
      Exclude<R, ServiceResolver.ServiceResolver | Scope.Scope>
    >;
  }

  /**
   * Get a layer that provides a service resolver for the given context.
   * The layer is scoped - when the scope closes, reference counts are decremented.
   */
  getResolverLayer(context: ResolutionContext = {}): Layer.Layer<ServiceResolver.ServiceResolver, never, Scope.Scope> {
    return Layer.scoped(ServiceResolver.ServiceResolver, this.getResolver(context));
  }

  /**
   * Get a service resolver for the given context.
   * The scope parameter controls the lifetime of space/process-scoped services.
   * When the scope is closed, reference counts are decremented and services may be cleaned up.
   */
  getResolver(context: ResolutionContext = {}): Effect.Effect<ServiceResolver.ServiceResolver, never, Scope.Scope> {
    return Effect.gen(this, function* () {
      if (this.#destroyed) {
        return yield* Effect.die('ServiceMesh has been destroyed');
      }

      const scope = yield* Scope.Scope;

      // Track which caches we've acquired references to.
      const acquiredSpaceRefs = new Set<CacheKey>();
      const acquiredProcessRefs = new Set<CacheKey>();

      // Add finalizer to decrement reference counts when scope closes.
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          for (const key of acquiredSpaceRefs) {
            this.#decrementRef(this.#spaceCache, key);
          }
          for (const key of acquiredProcessRefs) {
            this.#decrementRef(this.#processCache, key);
          }
        }),
      );

      const resolver = ServiceResolver.make(
        <I, S>(tag: Context.Tag<I, S>, resolutionContext: ServiceResolver.ResolutionContext) =>
          Effect.gen(this, function* () {
            const spec = this.#findLayerSpecForTag(tag);
            if (!spec) {
              return yield* Effect.fail(new ServiceNotAvailableError(String(tag.key ?? tag)));
            }

            // Merge resolution contexts.
            const mergedContext: ResolutionContext = {
              space: resolutionContext.space ?? context.space,
              pid: resolutionContext.process ?? context.pid,
            };

            // Get or create the service instance based on affinity.
            const instance = yield* this.#getOrCreateInstance(
              spec,
              mergedContext,
              acquiredSpaceRefs,
              acquiredProcessRefs,
            );

            const serviceValue = Context.getOption(instance.context, tag);
            if (Option.isNone(serviceValue)) {
              return yield* Effect.fail(new ServiceNotAvailableError(String(tag.key ?? tag)));
            }

            return serviceValue.value as S;
          }),
      );

      return resolver;
    });
  }

  /**
   * Destroy the service mesh and clean up all cached services.
   */
  destroy(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      if (this.#destroyed) {
        return;
      }
      this.#destroyed = true;

      log('ServiceMesh: destroying');

      // Close all application-scoped services.
      for (const [key, instance] of this.#applicationCache) {
        log('ServiceMesh: closing application service', { key });
        yield* Scope.close(instance.scope, Exit.void);
      }
      this.#applicationCache.clear();

      // Close all space-scoped services.
      for (const [key, instance] of this.#spaceCache) {
        log('ServiceMesh: closing space service', { key });
        yield* Scope.close(instance.scope, Exit.void);
      }
      this.#spaceCache.clear();

      // Close all process-scoped services.
      for (const [key, instance] of this.#processCache) {
        log('ServiceMesh: closing process service', { key });
        yield* Scope.close(instance.scope, Exit.void);
      }
      this.#processCache.clear();

      this.#layerSpecs.length = 0;
      this.#sortedByAffinity.clear();

      log('ServiceMesh: destroyed');
    });
  }

  /**
   * Rebuild the topologically sorted layer spec lists for each affinity.
   */
  #rebuildSortedLayerSpecs(): void {
    this.#sortedByAffinity.clear();

    const byAffinity = new Map<LayerSpec.Affinity, LayerSpec.LayerSpec[]>();
    for (const spec of this.#layerSpecs) {
      const list = byAffinity.get(spec.affinity) ?? [];
      list.push(spec);
      byAffinity.set(spec.affinity, list);
    }

    for (const [affinity, specs] of byAffinity) {
      this.#sortedByAffinity.set(affinity, this.#topologicalSort(specs));
    }
  }

  /**
   * Topologically sort layer specs based on their dependencies.
   * Specs that provide dependencies come before specs that require them.
   */
  #topologicalSort(specs: LayerSpec.LayerSpec[]): LayerSpec.LayerSpec[] {
    // Build a map of tag keys to specs that provide them.
    const providersMap = new Map<string, LayerSpec.LayerSpec>();
    for (const spec of specs) {
      for (const tag of spec.provides) {
        providersMap.set(tag.key, spec);
      }
    }

    // Build adjacency list: spec -> specs it depends on.
    const dependencies = new Map<LayerSpec.LayerSpec, Set<LayerSpec.LayerSpec>>();
    for (const spec of specs) {
      const deps = new Set<LayerSpec.LayerSpec>();
      for (const tag of spec.requires) {
        const provider = providersMap.get(tag.key);
        if (provider && provider !== spec && specs.includes(provider)) {
          deps.add(provider);
        }
      }
      dependencies.set(spec, deps);
    }

    // Kahn's algorithm for topological sort.
    const result: LayerSpec.LayerSpec[] = [];
    const inDegree = new Map<LayerSpec.LayerSpec, number>();
    const queue: LayerSpec.LayerSpec[] = [];

    // Calculate in-degrees.
    for (const spec of specs) {
      inDegree.set(spec, 0);
    }
    for (const [spec, deps] of dependencies) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
      }
    }

    // Find specs with no dependents (in-degree 0).
    for (const [spec, degree] of inDegree) {
      if (degree === 0) {
        queue.push(spec);
      }
    }

    // Process queue.
    while (queue.length > 0) {
      const spec = queue.shift()!;
      result.push(spec);

      const deps = dependencies.get(spec) ?? new Set();
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) ?? 0) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    // If we couldn't sort all specs, there's a cycle - just return original order.
    if (result.length !== specs.length) {
      log.warn('ServiceMesh: cycle detected in layer spec dependencies, using original order');
      return specs;
    }

    // Reverse to get dependencies first.
    return result.reverse();
  }

  /**
   * Find the layer spec that provides the given tag.
   */
  #findLayerSpecForTag(tag: Context.Tag<any, any>): LayerSpec.LayerSpec | undefined {
    for (const spec of this.#layerSpecs) {
      for (const providedTag of spec.provides) {
        if (providedTag.key === tag.key) {
          return spec;
        }
      }
    }
    return undefined;
  }

  /**
   * Get or create a service instance based on its affinity.
   */
  #getOrCreateInstance(
    spec: LayerSpec.LayerSpec,
    context: ResolutionContext,
    acquiredSpaceRefs: Set<CacheKey>,
    acquiredProcessRefs: Set<CacheKey>,
  ): Effect.Effect<CachedInstance, ServiceNotAvailableError, Scope.Scope> {
    return Effect.gen(this, function* () {
      switch (spec.affinity) {
        case 'application': {
          const key = this.#getApplicationCacheKey(spec);
          let instance = this.#applicationCache.get(key);
          if (!instance) {
            instance = yield* this.#createInstance(spec, context, acquiredSpaceRefs, acquiredProcessRefs);
            this.#applicationCache.set(key, instance);
            log('ServiceMesh: created application service', { key });
          }
          return instance;
        }

        case 'space': {
          if (!context.space) {
            return yield* Effect.fail(
              new ServiceNotAvailableError(
                `Space-scoped service requires space context: ${this.#getLayerSpecName(spec)}`,
              ),
            );
          }
          const key = this.#getSpaceCacheKey(spec, context.space);
          let instance = this.#spaceCache.get(key);
          if (!instance) {
            instance = yield* this.#createInstance(spec, context, acquiredSpaceRefs, acquiredProcessRefs);
            this.#spaceCache.set(key, instance);
            log('ServiceMesh: created space service', { key, space: context.space });
          }
          // Increment ref count if not already acquired.
          if (!acquiredSpaceRefs.has(key)) {
            MutableRef.update(instance.refCount, (count) => count + 1);
            acquiredSpaceRefs.add(key);
          }
          return instance;
        }

        case 'process': {
          if (!context.pid) {
            return yield* Effect.fail(
              new ServiceNotAvailableError(
                `Process-scoped service requires process context: ${this.#getLayerSpecName(spec)}`,
              ),
            );
          }
          const key = this.#getProcessCacheKey(spec, context.pid);
          let instance = this.#processCache.get(key);
          if (!instance) {
            instance = yield* this.#createInstance(spec, context, acquiredSpaceRefs, acquiredProcessRefs);
            this.#processCache.set(key, instance);
            log('ServiceMesh: created process service', { key, pid: context.pid });
          }
          // Increment ref count if not already acquired.
          if (!acquiredProcessRefs.has(key)) {
            MutableRef.update(instance.refCount, (count) => count + 1);
            acquiredProcessRefs.add(key);
          }
          return instance;
        }
      }
    });
  }

  /**
   * Create a new service instance.
   */
  #createInstance(
    spec: LayerSpec.LayerSpec,
    context: ResolutionContext,
    acquiredSpaceRefs: Set<CacheKey>,
    acquiredProcessRefs: Set<CacheKey>,
  ): Effect.Effect<CachedInstance, ServiceNotAvailableError, Scope.Scope> {
    return Effect.gen(this, function* () {
      const instanceScope = yield* Scope.make();

      // Resolve dependencies - pass through the acquired refs for proper reference counting.
      const dependencyContext = yield* this.#resolveDependencies(
        spec,
        context,
        acquiredSpaceRefs,
        acquiredProcessRefs,
      );

      // Build the service layer.
      const builtContext = yield* Layer.buildWithScope(spec.layer, instanceScope).pipe(
        Effect.provide(dependencyContext),
        Effect.catchAll((error) =>
          Effect.fail(
            new ServiceNotAvailableError(`Failed to build service ${this.#getLayerSpecName(spec)}: ${error}`),
          ),
        ),
      );

      return {
        context: builtContext,
        scope: instanceScope,
        refCount: MutableRef.make(0),
      };
    });
  }

  /**
   * Resolve dependencies for a layer spec.
   */
  #resolveDependencies(
    spec: LayerSpec.LayerSpec,
    context: ResolutionContext,
    acquiredSpaceRefs: Set<CacheKey>,
    acquiredProcessRefs: Set<CacheKey>,
  ): Effect.Effect<Context.Context<any>, ServiceNotAvailableError, Scope.Scope> {
    return Effect.gen(this, function* () {
      let result: Context.Context<any> = Context.empty() as Context.Context<any>;

      for (const tag of spec.requires) {
        const depSpec = this.#findLayerSpecForTag(tag);
        if (depSpec) {
          // Recursively resolve dependency with proper reference counting.
          const instance = yield* this.#getOrCreateInstance(depSpec, context, acquiredSpaceRefs, acquiredProcessRefs);
          result = Context.merge(result, instance.context);
        }
      }

      return result;
    });
  }

  /**
   * Decrement reference count and clean up if zero.
   */
  #decrementRef(cache: Map<CacheKey, CachedInstance>, key: CacheKey): void {
    const instance = cache.get(key);
    if (!instance) {
      return;
    }

    const newCount = MutableRef.updateAndGet(instance.refCount, (count) => Math.max(0, count - 1));
    if (newCount === 0) {
      log('ServiceMesh: cleaning up service', { key });
      cache.delete(key);
      Effect.runFork(Scope.close(instance.scope, Exit.void));
    }
  }

  #getApplicationCacheKey(spec: LayerSpec.LayerSpec): string {
    return spec.provides.map((tag) => tag.key).join(',');
  }

  #getSpaceCacheKey(spec: LayerSpec.LayerSpec, space: SpaceId): string {
    return `${space}:${spec.provides.map((tag) => tag.key).join(',')}`;
  }

  #getProcessCacheKey(spec: LayerSpec.LayerSpec, pid: string): string {
    return `${pid}:${spec.provides.map((tag) => tag.key).join(',')}`;
  }

  #getLayerSpecName(spec: LayerSpec.LayerSpec): string {
    return spec.provides.map((tag) => String(tag.key ?? tag)).join(', ');
  }
}

/**
 * Tag for the ServiceMesh service.
 */
export class ServiceMeshService extends Context.Tag('@dxos/functions-runtime/ServiceMeshService')<
  ServiceMeshService,
  ServiceMesh
>() {}

/**
 * Create a layer that provides a ServiceMesh.
 */
export const layer = (layerSpecs: LayerSpec.LayerSpec[] = []): Layer.Layer<ServiceMeshService> =>
  Layer.scoped(
    ServiceMeshService,
    Effect.gen(function* () {
      const mesh = new ServiceMesh(layerSpecs);
      yield* Effect.addFinalizer(() => mesh.destroy());
      return mesh;
    }),
  );
