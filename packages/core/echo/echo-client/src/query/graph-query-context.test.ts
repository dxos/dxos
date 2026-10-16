//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Event } from '@dxos/async';
import { Filter, Obj, Order, Query, type QueryResult } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { EntityId } from '@dxos/keys';

import { GraphQueryContext, type QuerySource } from './graph-query-context.ts';
import { type SourceEntry } from './query-context.ts';

/** A source that answers with fixed entries, in the order given. */
class FixedSource implements QuerySource {
  readonly changed = new Event<void>();

  constructor(
    readonly kind: QueryResult.Source,
    private readonly _entries: SourceEntry[],
  ) {}

  isServing(): boolean {
    return true;
  }

  answers(): number {
    return this.kind === 'local' ? 0 : 1;
  }

  isFailed(): boolean {
    return false;
  }

  open(): void {}

  close(): void {}

  getResults(): SourceEntry[] {
    return this._entries;
  }

  isSynchronous(): boolean {
    return this.kind === 'local';
  }

  isPending(): boolean {
    return false;
  }

  async run(): Promise<SourceEntry[]> {
    return this._entries;
  }

  update(_query: QueryAST.Query): void {}
}

const entry = (id: string, source: 'local' | 'index'): SourceEntry => ({
  id,
  result: Obj.make(TestSchema.Person, { id, name: id }),
  resolution: { source, time: 0 },
});

const merge = (query: Query.Any, local: string[], remote: string[]): string[] => {
  const context = new GraphQueryContext({ onStart: () => {}, onStop: () => {} });
  context.addQuerySource(
    new FixedSource(
      'local',
      local.map((id) => entry(id, 'local')),
    ),
  );
  context.addQuerySource(
    new FixedSource(
      'index',
      remote.map((id) => entry(id, 'index')),
    ),
  );
  context.update(query.ast);
  return context.getResults().map((result) => result.id);
};

describe('GraphQueryContext', () => {
  const [a, b, c] = [EntityId.random(), EntityId.random(), EntityId.random()];

  test('an unordered selection merges in id order, whichever source holds each object', ({ expect }) => {
    // The working set holds only the objects written since load; the index answers for all of them.
    const merged = merge(Query.select(Filter.type(TestSchema.Person)), [a, c], [a, b, c]);
    expect([...new Set(merged)]).toEqual([a, b, c]);
  });

  test('an explicit order is left to the sources', ({ expect }) => {
    const merged = merge(Query.select(Filter.type(TestSchema.Person)).orderBy(Order.rank()), [c], [a, b]);
    expect(merged).toEqual([c, a, b]);
  });
});
