//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { type Database, Entity, type Filter, Query, Registry, Type } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { filterMatchEntity } from '@dxos/echo/internal';
import { DXN } from '@dxos/keys';

import { LiveQueryResult } from './query-result.ts';

let nextRegistryId = 0;

/**
 * In-process registry of types (and other keyed entities), indexed by id and by typename DXN.
 */
export class SimpleRegistry implements Registry.Registry {
  readonly [Registry.TypeId]: Registry.TypeId = Registry.TypeId;
  readonly id = `echo-sqlite-registry-${nextRegistryId++}`;
  readonly changed = new Event<void>();
  readonly #invalidated = new Event<ReadonlySet<string>>();
  readonly #entities = new Map<string, Entity.Unknown>();

  constructor(initial: readonly Entity.Unknown[] = []) {
    initial.forEach((entity) => this.#entities.set(entity.id, entity));
    this.changed.on(() => this.#invalidated.emit(new Set()));
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

  query: Database.QueryFn = ((queryOrFilter: Query.Any | Filter.Any) => {
    const ast = (Query.is(queryOrFilter) ? queryOrFilter : Query.select(queryOrFilter)).ast;
    return new LiveQueryResult({
      execute: async () => matchRegistry(ast, this.list()),
      invalidated: this.#invalidated,
      source: 'registry',
    });
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

/**
 * Evaluates a query over the in-process registry: a small, code-shipped set of entities, and the one
 * place in-memory matching is allowed. Scope clauses are unwrapped; only locally-evaluable clauses are
 * supported.
 */
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
