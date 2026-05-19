//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import type * as Obj from './Obj';
import * as Type from './Type';

/**
 * Composable, in-memory registry of keyed ECHO objects.
 *
 * Objects are stored as an array and queried via the standard ECHO Query API.
 * A registry may delegate to an optional upstream registry: results from the local
 * registry take precedence and upstream results fill in anything not found locally.
 *
 * Intended use cases include caches of schemas, operations, blueprints, routines, plugins,
 * etc., sourced from 3rd-party plugins, local code, or local space objects.
 *
 * Scope: a Registry is independent of any ECHO space or Hypergraph — it is a process-local,
 * in-memory cache. Wire one per space (e.g. as a Layer scoped to the space's Effect runtime)
 * or share a single instance across spaces depending on the use case.
 */
export interface Registry {
  /**
   * Fires whenever local registry contents change (add, remove, or clear).
   */
  readonly changed: ReadOnlyEvent<void>;

  /**
   * All locally-stored objects.
   * Does not include upstream objects — use {@link list} for that.
   */
  readonly local: readonly Obj.Unknown[];

  /**
   * Add or replace one or more objects in the local registry.
   * Existing entries with the same id are replaced.
   */
  add(objects: readonly Obj.Unknown[]): void;

  /**
   * Remove an object by id from the local registry.
   * @returns true if an object was removed, false if it was not found.
   */
  remove(id: string): boolean;

  /**
   * Remove all locally-stored objects.
   * Does not affect the upstream registry.
   */
  clear(): void;

  /**
   * Get an object by id.
   * Searches the local registry first, then falls back to the upstream registry.
   */
  get(id: string): Obj.Unknown | undefined;

  /**
   * List all objects.
   * Local objects take precedence over upstream objects with the same id.
   */
  list(): Obj.Unknown[];

  //
  // Static schema types (Type.AnyEntity)
  //

  // TODO(wittjosiah): Can these be integrated into the object registry?

  /**
   * Register static TypeScript schema types.
   * Existing entries with the same DXN are replaced.
   * Also indexes by identifier DXN (TypeIdentifierAnnotationId) if present.
   * Fires {@link changed}.
   */
  addTypes(types: readonly Type.AnyEntity[]): void;

  /**
   * Look up a registered schema type by its DXN string.
   * Falls back to the upstream registry if not found locally.
   */
  getTypeByDXN(dxn: string): Type.AnyEntity | undefined;

  /**
   * All locally-registered schema types as a synchronous snapshot.
   * Suitable for synchronous contexts such as React hooks and atoms.
   * Subscribe to {@link changed} to react to updates.
   * Does not include upstream types.
   */
  readonly types: readonly Type.AnyEntity[];

  /**
   * List all locally-registered schema types as an Effect.
   * Use {@link types} in synchronous contexts; prefer this in Effect generators (yield*) and async functions.
   * Does not include upstream types.
   */
  listTypes(): Effect.Effect<readonly Type.AnyEntity[]>;

  /**
   * Signal that a registered type has changed without adding or removing types.
   * Fires {@link changed}.
   * Used when a PersistentSchema-backed type is invalidated.
   */
  touch(): void;
}

/**
 * Options for {@link make}.
 */
export type Options = {
  /**
   * Optional upstream registry. Queries fall back to upstream when an object
   * is not present in the local registry.
   */
  upstream?: Registry;

  /**
   * Initial set of objects to seed the local registry with.
   */
  initial?: readonly Obj.Unknown[];
};

/**
 * Create a new {@link Registry}.
 */
export const make = (options: Options = {}): Registry => new RegistryImpl(options);

/**
 * Effect Context tag for {@link Registry}.
 * Use this to inject a registry into Effect-based code.
 */
export class Service extends Context.Tag('@dxos/echo/Registry/Service')<Service, Registry>() {}

/**
 * Build an Effect Layer providing a {@link Registry} with the given options.
 */
export const layer = (options: Options = {}): Layer.Layer<Service> => Layer.sync(Service, () => make(options));

/**
 * Build an Effect Layer that delegates to an upstream registry from the Effect environment.
 *
 * @example
 * ```ts
 * const localLayer = Registry.layerWithUpstream({ initial: [...] });
 * const stack = Layer.provide(localLayer, upstreamLayer);
 * ```
 */
export const layerWithUpstream = (options: Omit<Options, 'upstream'> = {}): Layer.Layer<Service, never, Service> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const upstream = yield* Service;
      return make({ ...options, upstream });
    }),
  );

//
// Implementation
//

class RegistryImpl implements Registry {
  readonly #changed = new Event<void>();
  readonly #objects: Map<string, Obj.Unknown> = new Map();
  readonly #types: Map<string, Type.AnyEntity> = new Map();
  readonly #upstream: Registry | undefined;

  constructor(options: Options) {
    this.#upstream = options.upstream;
    if (options.initial) {
      this.add(options.initial);
    }
  }

  get changed(): ReadOnlyEvent<void> {
    return this.#changed;
  }

  get local(): readonly Obj.Unknown[] {
    return Array.from(this.#objects.values());
  }

  add(objects: readonly Obj.Unknown[]): void {
    for (const object of objects) {
      this.#put(object);
    }
    this.#changed.emit();
  }

  remove(id: string): boolean {
    const removed = this.#objects.delete(id);
    if (removed) {
      this.#changed.emit();
    }
    return removed;
  }

  clear(): void {
    this.#objects.clear();
    this.#changed.emit();
  }

  get(id: string): Obj.Unknown | undefined {
    return this.#objects.get(id) ?? this.#upstream?.get(id);
  }

  list(): Obj.Unknown[] {
    if (!this.#upstream) {
      return Array.from(this.#objects.values());
    }
    const out = new Map<string, Obj.Unknown>();
    for (const object of this.#upstream.list()) {
      out.set(getId(object), object);
    }
    for (const [id, object] of this.#objects) {
      out.set(id, object);
    }
    return Array.from(out.values());
  }

  addTypes(types: readonly Type.AnyEntity[]): void {
    for (const schema of types) {
      const identifierDXN = Type.getDXN(schema);
      if (identifierDXN != null) {
        // Schema has an identifier DXN (e.g. dxn:echo:@:objectId for PersistentSchema-backed RuntimeTypes).
        // Index ONLY by identifier DXN to avoid overwriting static schemas that share the same typename/version.
        this.#types.set(identifierDXN.toString(), schema);
      } else {
        // Static schema (no identifier DXN): index by typename DXN.
        const dxn = getTypeDXN(schema);
        this.#types.set(dxn, schema);
      }
    }
    this.#changed.emit();
  }

  getTypeByDXN(dxn: string): Type.AnyEntity | undefined {
    const local = this.#types.get(normalizeDXN(dxn));
    if (local != null) {
      return local;
    }
    return this.#upstream?.getTypeByDXN(dxn);
  }

  get types(): readonly Type.AnyEntity[] {
    // De-duplicate: multiple keys can point to the same type instance (e.g. typename DXN + identifier DXN).
    return Array.from(new Set(this.#types.values()));
  }

  listTypes(): Effect.Effect<readonly Type.AnyEntity[]> {
    return Effect.sync(() => this.types);
  }

  touch(): void {
    this.#changed.emit();
  }

  #put(object: Obj.Unknown): void {
    const id = getId(object);
    invariant(typeof id === 'string' && id.length > 0, 'Object must have an id');
    this.#objects.set(id, object);
  }
}

const getId = (object: Obj.Unknown): string => {
  const id = (object as { id?: unknown }).id;
  invariant(typeof id === 'string', 'Object must have a string id');
  return id;
};

/**
 * Returns the canonical DXN string key for a schema type.
 * Format: "dxn:type:<typename>:<version>".
 */
const getTypeDXN = (schema: Type.AnyEntity): string => {
  const typename = Type.getTypename(schema);
  const version = Type.getVersion(schema);
  invariant(typename, 'Schema type must have a typename');
  invariant(version, 'Schema type must have a version');
  return `dxn:type:${typename}:${version}`;
};

/**
 * Normalizes a DXN string to the canonical "dxn:type:<typename>:<version>" form.
 * Accepts both the full form and the short "typename:version" form.
 */
const normalizeDXN = (dxn: string): string => {
  if (dxn.startsWith('dxn:')) {
    return dxn;
  }
  // Legacy short form: "typename:version" — prefix with "dxn:type:".
  const lastColon = dxn.lastIndexOf(':');
  if (lastColon === -1) {
    return `dxn:type:${dxn}:`;
  }
  const typename = dxn.slice(0, lastColon);
  const version = dxn.slice(lastColon + 1);
  return `dxn:type:${typename}:${version}`;
};
