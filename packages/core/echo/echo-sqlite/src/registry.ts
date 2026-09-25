//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { type Database, Entity, type Filter, Query, Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { executeQuery } from './query-engine.ts';
import { LiveQueryResult } from './query-result.ts';

let nextRegistryId = 0;

/**
 * In-process registry of types (and other keyed entities), indexed by id and by typename DXN.
 */
export class SimpleRegistry implements Registry.Registry {
  readonly [Registry.TypeId]: Registry.TypeId = Registry.TypeId;
  readonly id = `echo-sqlite-registry-${nextRegistryId++}`;
  readonly changed = new Event<void>();
  readonly #entities = new Map<string, Entity.Unknown>();

  constructor(initial: readonly Entity.Unknown[] = []) {
    initial.forEach((entity) => this.#entities.set(entity.id, entity));
  }

  get local(): readonly Entity.Unknown[] {
    return this.list();
  }

  add(entities: readonly Entity.Unknown[]): void {
    entities.forEach((entity) => this.#entities.set(entity.id, entity));
    this.changed.emit();
  }

  remove(id: string): boolean {
    const removed = this.#entities.delete(id);
    if (removed) {
      this.changed.emit();
    }
    return removed;
  }

  clear(): void {
    this.#entities.clear();
    this.changed.emit();
  }

  get(id: string): Entity.Unknown | undefined {
    return this.#entities.get(id);
  }

  /**
   * Finds an entity by `dxn:<typename|key>[:<version>]`; an unversioned DXN matches the latest registration.
   */
  getByURI(uri: string): Entity.Unknown | undefined {
    const dxn = DXN.tryMake(uri);
    if (!dxn) {
      return undefined;
    }
    const name = DXN.getName(dxn);
    const version = DXN.getVersion(dxn);
    let match: Entity.Unknown | undefined;
    for (const entity of this.#entities.values()) {
      const key = keyOf(entity);
      if (key?.name === name && (version === undefined || key.version === version)) {
        match = entity;
      }
    }
    return match;
  }

  list(): Entity.Unknown[] {
    return [...this.#entities.values()];
  }

  query: Database.QueryFn = ((queryOrFilter: Query.Any | Filter.Any) =>
    new LiveQueryResult({
      ast: (Query.is(queryOrFilter) ? queryOrFilter : Query.select(queryOrFilter)).ast,
      changed: this.changed,
      source: 'registry',
      evaluate: (ast) =>
        executeQuery(
          {
            // Scope clauses in a direct registry query are ignored: it always targets its own entities.
            spaceId: undefined,
            entities: () => this.list(),
            getEntity: (id) => this.get(id),
            getTimestamps: () => undefined,
            registryEntities: () => this.list(),
          },
          ast,
        ),
      // The overloaded `QueryFn` cannot be satisfied by one generic implementation without a cast.
    })) as Database.QueryFn;
}

const keyOf = (entity: Entity.Unknown): { name: string; version?: string } | undefined => {
  if (Type.isType(entity)) {
    return { name: Type.getTypename(entity), version: Type.getVersion(entity) };
  }
  const meta = Entity.getMeta(entity);
  return meta.key ? { name: meta.key, version: meta.version } : undefined;
};
