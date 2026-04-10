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

import * as Service from './Service';

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
  readonly #services: Service.Service[] = [];
  readonly #sortedByAffinity = new Map<Service.Affinity, Service.Service[]>();

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

  constructor(services: Service.Service[] = []) {
    this.add(services);
  }

  /**
   * Add services to the mesh.
   */
  add(services: Service.Service | Service.Service[]): void {
    if (this.#destroyed) {
      throw new Error('ServiceMesh has been destroyed');
    }

    const toAdd = Array.isArray(services) ? services : [services];
    for (const service of toAdd) {
      if (!this.#services.includes(service)) {
        this.#services.push(service);
      }
    }
    this.#rebuildSortedServices();
  }

  /**
   * Remove services from the mesh.
   */
  remove(services: Service.Service | Service.Service[]): void {
    if (this.#destroyed) {
      throw new Error('ServiceMesh has been destroyed');
    }

    const toRemove = Array.isArray(services) ? services : [services];
    for (const service of toRemove) {
      const index = this.#services.indexOf(service);
      if (index !== -1) {
        this.#services.splice(index, 1);
      }
    }
    this.#rebuildSortedServices();
  }

  /**
   * Run an effect with a service resolver provided for the given context.
   * The resolver scope is tied to the effect's scope.
   */
  run<A, E, R>(
    effect: Effect.Effect<A, E, R | ServiceResolver.ServiceResolver>,
    context: ResolutionContext = {},
  ): Effect.Effect<A, E, Exclude<R, ServiceResolver.ServiceResolver>> {
    return Effect.scoped(
      Effect.gen(this, function* () {
        const resolver = yield* this.getResolver(context);
        return yield* effect.pipe(Effect.provideService(ServiceResolver.ServiceResolver, resolver));
      }),
    ) as Effect.Effect<A, E, Exclude<R, ServiceResolver.ServiceResolver>>;
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
          const service = this.#findServiceForTag(tag);
          if (!service) {
            return yield* Effect.fail(new ServiceNotAvailableError(String(tag.key ?? tag)));
          }

          // Merge resolution contexts.
          const mergedContext: ResolutionContext = {
            space: resolutionContext.space ?? context.space,
            pid: resolutionContext.process ?? context.pid,
          };

          // Get or create the service instance based on affinity.
          const instance = yield* this.#getOrCreateInstance(
            service,
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

      this.#services.length = 0;
      this.#sortedByAffinity.clear();

      log('ServiceMesh: destroyed');
    });
  }

  /**
   * Rebuild the topologically sorted service lists for each affinity.
   */
  #rebuildSortedServices(): void {
    this.#sortedByAffinity.clear();

    const byAffinity = new Map<Service.Affinity, Service.Service[]>();
    for (const service of this.#services) {
      const list = byAffinity.get(service.affinity) ?? [];
      list.push(service);
      byAffinity.set(service.affinity, list);
    }

    for (const [affinity, services] of byAffinity) {
      this.#sortedByAffinity.set(affinity, this.#topologicalSort(services));
    }
  }

  /**
   * Topologically sort services based on their dependencies.
   * Services that provide dependencies come before services that require them.
   */
  #topologicalSort(services: Service.Service[]): Service.Service[] {
    // Build a map of tag keys to services that provide them.
    const providersMap = new Map<string, Service.Service>();
    for (const service of services) {
      for (const tag of service.provides) {
        providersMap.set(tag.key, service);
      }
    }

    // Build adjacency list: service -> services it depends on.
    const dependencies = new Map<Service.Service, Set<Service.Service>>();
    for (const service of services) {
      const deps = new Set<Service.Service>();
      for (const tag of service.requires) {
        const provider = providersMap.get(tag.key);
        if (provider && provider !== service && services.includes(provider)) {
          deps.add(provider);
        }
      }
      dependencies.set(service, deps);
    }

    // Kahn's algorithm for topological sort.
    const result: Service.Service[] = [];
    const inDegree = new Map<Service.Service, number>();
    const queue: Service.Service[] = [];

    // Calculate in-degrees.
    for (const service of services) {
      inDegree.set(service, 0);
    }
    for (const [service, deps] of dependencies) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
      }
    }

    // Find services with no dependents (in-degree 0).
    for (const [service, degree] of inDegree) {
      if (degree === 0) {
        queue.push(service);
      }
    }

    // Process queue.
    while (queue.length > 0) {
      const service = queue.shift()!;
      result.push(service);

      const deps = dependencies.get(service) ?? new Set();
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) ?? 0) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    // If we couldn't sort all services, there's a cycle - just return original order.
    if (result.length !== services.length) {
      log.warn('ServiceMesh: cycle detected in service dependencies, using original order');
      return services;
    }

    // Reverse to get dependencies first.
    return result.reverse();
  }

  /**
   * Find the service that provides the given tag.
   */
  #findServiceForTag(tag: Context.Tag<any, any>): Service.Service | undefined {
    for (const service of this.#services) {
      for (const providedTag of service.provides) {
        if (providedTag.key === tag.key) {
          return service;
        }
      }
    }
    return undefined;
  }

  /**
   * Get or create a service instance based on its affinity.
   */
  #getOrCreateInstance(
    service: Service.Service,
    context: ResolutionContext,
    acquiredSpaceRefs: Set<CacheKey>,
    acquiredProcessRefs: Set<CacheKey>,
  ): Effect.Effect<CachedInstance, ServiceResolver.ServiceNotAvailableError, Scope.Scope> {
    return Effect.gen(this, function* () {
      switch (service.affinity) {
        case 'application': {
          const key = this.#getApplicationCacheKey(service);
          let instance = this.#applicationCache.get(key);
          if (!instance) {
            instance = yield* this.#createInstance(service, context);
            this.#applicationCache.set(key, instance);
            log('ServiceMesh: created application service', { key });
          }
          return instance;
        }

        case 'space': {
          if (!context.space) {
            return yield* Effect.fail(
              new ServiceNotAvailableError(`Space-scoped service requires space context: ${this.#getServiceName(service)}`),
            );
          }
          const key = this.#getSpaceCacheKey(service, context.space);
          let instance = this.#spaceCache.get(key);
          if (!instance) {
            instance = yield* this.#createInstance(service, context);
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
              new ServiceNotAvailableError(`Process-scoped service requires process context: ${this.#getServiceName(service)}`),
            );
          }
          const key = this.#getProcessCacheKey(service, context.pid);
          let instance = this.#processCache.get(key);
          if (!instance) {
            instance = yield* this.#createInstance(service, context);
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
    service: Service.Service,
    context: ResolutionContext,
  ): Effect.Effect<CachedInstance, ServiceResolver.ServiceNotAvailableError, Scope.Scope> {
    return Effect.gen(this, function* () {
      const instanceScope = yield* Scope.make();

      // Resolve dependencies.
      const dependencyContext = yield* this.#resolveDependencies(service, context);

      // Build the service layer.
      const builtContext = yield* Layer.buildWithScope(service.layer, instanceScope).pipe(
        Effect.provide(dependencyContext),
        Effect.catchAll((error) =>
          Effect.fail(new ServiceNotAvailableError(`Failed to build service ${this.#getServiceName(service)}: ${error}`)),
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
   * Resolve dependencies for a service.
   */
  #resolveDependencies(
    service: Service.Service,
    context: ResolutionContext,
  ): Effect.Effect<Context.Context<any>, ServiceResolver.ServiceNotAvailableError, Scope.Scope> {
    return Effect.gen(this, function* () {
      let result: Context.Context<any> = Context.empty() as Context.Context<any>;

      for (const tag of service.requires) {
        const depService = this.#findServiceForTag(tag);
        if (depService) {
          // Recursively resolve dependency.
          const instance = yield* this.#getOrCreateInstance(depService, context, new Set(), new Set());
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

  #getApplicationCacheKey(service: Service.Service): string {
    return service.provides.map((tag) => tag.key).join(',');
  }

  #getSpaceCacheKey(service: Service.Service, space: SpaceId): string {
    return `${space}:${service.provides.map((tag) => tag.key).join(',')}`;
  }

  #getProcessCacheKey(service: Service.Service, pid: string): string {
    return `${pid}:${service.provides.map((tag) => tag.key).join(',')}`;
  }

  #getServiceName(service: Service.Service): string {
    return service.provides.map((tag) => String(tag.key ?? tag)).join(', ');
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
export const layer = (services: Service.Service[] = []): Layer.Layer<ServiceMeshService> =>
  Layer.scoped(
    ServiceMeshService,
    Effect.gen(function* () {
      const mesh = new ServiceMesh(services);
      yield* Effect.addFinalizer(() => mesh.destroy());
      return mesh;
    }),
  );
