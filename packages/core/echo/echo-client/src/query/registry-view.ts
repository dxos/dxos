//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type QueryResult, type Registry } from '@dxos/echo';
import { filterMatchEntity } from '@dxos/echo-host/filter';
import { type QueryAST } from '@dxos/echo-protocol';
import { log } from '@dxos/log';

import { getRegistryScopeForQuery, isSimpleSelectionQuery } from './util.ts';

/**
 * One live query's view of the in-process registry, the second half of the {@link LocalQueryEngine}'s
 * synchronous side. Opt-in: it answers only a query whose `from` clause carries an explicit local registry
 * scope (`.from(Scope.registry())`, `.from(Scope.space(), Scope.registry())`), so a plain `db.query(...)`
 * never consults it. Its entries have no document and nothing to revalidate.
 */
export class RegistryView {
  readonly changed = new Event<void>();

  readonly #registry: Registry.Registry;
  #ctx: Context | undefined = undefined;
  #query: QueryAST.Query | undefined = undefined;

  constructor(registry: Registry.Registry) {
    this.#registry = registry;
  }

  /** Whether this view answers the current query. */
  isServing(): boolean {
    return this.#query !== undefined;
  }

  close(): void {
    void this.#ctx?.dispose().catch((err) => log.catch(err));
    this.#ctx = undefined;
    this.#query = undefined;
  }

  update(query: QueryAST.Query): void {
    void this.#ctx?.dispose().catch((err) => log.catch(err));
    this.#ctx = undefined;
    if (!isRegistryQuery(query)) {
      this.#query = undefined;
      return;
    }
    this.#ctx = new Context();
    this.#query = query;
    // `Registry.add`/`remove`/`clear` emit synchronously, so a registry write reaches subscribers in its frame.
    this.#registry.changed.on(this.#ctx, () => this.changed.emit());
    this.changed.emit();
  }

  getResults(): QueryResult.EntityEntry[] {
    return this.#query ? this.evaluate(this.#query) : [];
  }

  /** A one-shot answer from the registry as it is now. */
  evaluate(query: QueryAST.Query): QueryResult.EntityEntry[] {
    const simple = isRegistryQuery(query) ? isSimpleSelectionQuery(query) : null;
    if (!simple) {
      return [];
    }
    return this.#registry.list().flatMap((object) =>
      filterMatchEntity(simple.filter, object)
        ? [
            {
              id: object.id,
              result: object,
              match: { rank: 1 },
              resolution: { source: 'registry' as const, time: 0 },
            },
          ]
        : [],
    );
  }
}

/** A simple selection over an explicit local registry scope; anything else the registry does not serve. */
const isRegistryQuery = (query: QueryAST.Query): boolean => {
  const scope = getRegistryScopeForQuery(query);
  if (!scope.included || !scope.locations.has('local')) {
    return false;
  }
  const simple = isSimpleSelectionQuery(query);
  return simple !== null && !simple.hasQueues;
};
