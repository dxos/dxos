//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { type Database, Entity, type Filter, Query, Registry, Type } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { filterMatchEntity } from '@dxos/echo/internal';
import { DXN } from '@dxos/keys';

import { BridgeQueryResult } from './query-result.ts';

let nextRegistryId = 0;

/**
 * The guest's types, indexed by id and by typename DXN; the shape `@dxos/echo-sqlite`'s registry has,
 * since both serve a database that holds no type rows of its own.
 */
export class GuestRegistry implements Registry.Registry {
  readonly [Registry.TypeId]: Registry.TypeId = Registry.TypeId;
  readonly id = `code-mode-djs-registry-${nextRegistryId++}`;
  readonly changed = new Event<void>();
  readonly #entities = new Map<string, Entity.Unknown>();

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

  /** Finds an entity by `dxn:<typename|key>[:<version>]`; an unversioned DXN matches the latest registration. */
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

  query: Database.QueryFn = ((queryOrFilter: Query.Any | Filter.Any) => {
    const ast = (Query.is(queryOrFilter) ? queryOrFilter : Query.select(queryOrFilter)).ast;
    return new BridgeQueryResult({ source: 'registry', execute: () => matchRegistry(ast, this.list()) });
    // The overloaded `QueryFn` cannot be satisfied by one generic implementation without a cast.
  }) as Database.QueryFn;
}

const keyOf = (entity: Entity.Unknown): { name: string; version?: string } | undefined => {
  if (Type.isType(entity)) {
    return { name: Type.getTypename(entity), version: Type.getVersion(entity) };
  }
  const meta = Entity.getMeta(entity);
  return meta.key ? { name: meta.key, version: meta.version } : undefined;
};

/** Evaluates a query over the registry: a small, code-shipped set, the one place matching runs in the guest. */
export const matchRegistry = (ast: QueryAST.Query, entities: readonly Entity.Unknown[]): Entity.Unknown[] => {
  switch (ast.type) {
    case 'select':
      return entities.filter((entity) => filterMatchEntity(ast.filter, entity));
    case 'filter':
      return matchRegistry(ast.selection, entities).filter((entity) => filterMatchEntity(ast.filter, entity));
    case 'limit':
      return matchRegistry(ast.query, entities).slice(0, ast.limit);
    case 'skip':
      return matchRegistry(ast.query, entities).slice(ast.skip);
    case 'from':
    case 'options':
      return matchRegistry(ast.query, entities);
    default:
      throw new Error(`Query clause not supported by the registry: ${ast.type}`);
  }
};
