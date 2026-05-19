//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type QueryResult } from '@dxos/echo';
import { filterMatchObjectJSON } from '@dxos/echo-pipeline/filter';
import { type QueryAST } from '@dxos/echo-protocol';
import { Registry } from '@dxos/echo-registry';

import { type QuerySource } from './graph-query-context';
import { getRegistryScopeForQuery, isSimpleSelectionQuery } from './util';

/**
 * QuerySource backed by the in-process registry.
 *
 * Included in the query fan-out when:
 * - The query has no explicit `from()` clause (defaults to local registry + all spaces), or
 * - The query's from clause contains `{ _tag: 'registry', location: 'local' }`.
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
    return simple !== null && !simple.hasQueues;
  }

  #match(filter: QueryAST.Filter): QueryResult.EntityEntry[] {
    return this.#registry
      .list()
      .filter((object) => filterMatchObjectJSON(filter, object as any))
      .map((object) => ({
        id: (object as { id: string }).id,
        result: object,
        match: { rank: 1 },
        resolution: { source: 'local' as const, time: 0 },
      }));
  }
}
