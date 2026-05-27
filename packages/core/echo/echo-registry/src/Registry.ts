//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { type Obj, Registry, type SchemaRegistry, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

/**
 * Concrete implementation of the {@link Registry.Registry} interface.
 * Stores objects in a local map and delegates unknown lookups to an optional upstream registry.
 */
export class RegistryImpl implements Registry.Registry {
  readonly #changed = new Event<void>();
  readonly #objects: Map<string, Obj.Unknown> = new Map();
  readonly #types: Map<string, Type.AnyEntity> = new Map();
  readonly #upstream: Registry.Registry | undefined;

  constructor(options: Registry.Options) {
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

  register(_inputs: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.RuntimeType[]> {
    throw new Error('Registry is not bound to a database. Use db.registry.register() instead.');
  }

  #put(object: Obj.Unknown): void {
    const id = getId(object);
    invariant(typeof id === 'string' && id.length > 0, 'Object must have an id');
    this.#objects.set(id, object);
  }
}

/**
 * Create a new {@link Registry.Registry}.
 */
export const make = (options: Registry.Options = {}): Registry.Registry => new RegistryImpl(options);

/**
 * Build an Effect Layer providing a {@link Registry.Registry} with the given options.
 */
export const layer = (options: Registry.Options = {}): Layer.Layer<Registry.Service> =>
  Layer.sync(Registry.Service, () => make(options));

/**
 * Build an Effect Layer that delegates to an upstream registry from the Effect environment.
 *
 * @example
 * ```ts
 * const localLayer = RegistryFactory.layerWithUpstream({ initial: [...] });
 * const stack = Layer.provide(localLayer, upstreamLayer);
 * ```
 */
export const layerWithUpstream = (
  options: Omit<Registry.Options, 'upstream'> = {},
): Layer.Layer<Registry.Service, never, Registry.Service> =>
  Layer.effect(
    Registry.Service,
    Effect.gen(function* () {
      const upstream = yield* Registry.Service;
      return make({ ...options, upstream });
    }),
  );

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
