//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type QueryResult, type Registry } from '@dxos/echo';
import { filterMatchEntity } from '@dxos/echo-host/filter';
import { type QueryAST } from '@dxos/echo-protocol';

import { type QuerySource } from './graph-query-context';
import { getRegistryScopeForQuery, isSimpleSelectionQuery } from './util';

/**
 * QuerySource backed by the in-process registry.
 *
 * The registry is opt-in: it only contributes to a query whose `from` clause carries
 * an explicit local registry scope — i.e. `.from(Scope.registry())` or
 * `.from(Scope.space(), Scope.registry())`. Plain `db.query(...)` (owning space only)
 * never consults it.
 */
export class RegistryQuerySource implements QuerySource {
  public readonly changed = new Event<void>();

  #registry: Registry.Registry;
  #ctx: Context | undefined = undefined;
  #query: QueryAST.Query | undefined = undefined;

  constructor(registry: Registry.Registry) {
    this.#registry = registry;
  }

  open(): void {}

  close(): void {
    void this.#ctx?.dispose().catch(() => {});
    this.#ctx = undefined;
    this.#query = undefined;
  }

  getResults(): QueryResult.EntityEntry[] {
    if (!this.#query || !this.#isValidSourceForQuery(this.#query)) {
      return [];
    }
    const simple = isSimpleSelectionQuery(this.#query);
    if (!simple) {
      return [];
    }
    return this.#match(simple.filter);
  }

  /** The in-process registry is matched synchronously. */
  isSynchronous(): boolean {
    return this.#query !== undefined && this.#isValidSourceForQuery(this.#query);
  }

  async run(_ctx: Context, query: QueryAST.Query): Promise<QueryResult.EntityEntry[]> {
    if (!this.#isValidSourceForQuery(query)) {
      return [];
    }
    const simple = isSimpleSelectionQuery(query);
    if (!simple) {
      return [];
    }
    return this.#match(simple.filter);
  }

  update(query: QueryAST.Query): void {
    if (!this.#isValidSourceForQuery(query)) {
      void this.#ctx?.dispose().catch(() => {});
      this.#ctx = undefined;
      this.#query = undefined;
      return;
    }

    void this.#ctx?.dispose().catch(() => {});
    this.#ctx = new Context();
    this.#query = query;

    this.#registry.changed.on(this.#ctx, () => {
      this.changed.emit();
    });

    this.changed.emit();
  }

  #isValidSourceForQuery(query: QueryAST.Query): boolean {
    const scope = getRegistryScopeForQuery(query);
    if (!scope.included || !scope.locations.has('local')) {
      return false;
    }
    const simple = isSimpleSelectionQuery(query);
    if (!simple || simple.hasQueues) {
      return false;
    }
    return true;
  }

  #match(filter: QueryAST.Filter): QueryResult.EntityEntry[] {
    return this.#registry.list().flatMap((object) => {
      if (!filterMatchEntity(filter, object)) {
        return [];
      }
      return [
        {
          id: object.id,
          result: object,
          match: { rank: 1 },
          resolution: { source: 'local' as const, time: 0 },
        },
      ];
    });
  }
}
