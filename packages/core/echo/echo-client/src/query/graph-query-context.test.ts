//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { Scope } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { QueryIncompleteError, type UnresolvedHit } from './errors.ts';
import { GraphQueryContext, type QuerySource } from './graph-query-context.ts';
import { type SourceEntry } from './query-context.ts';

const makeQuery = (spaceId: SpaceId): QueryAST.Query => ({
  type: 'from',
  query: {
    type: 'select',
    filter: { type: 'object', typename: DXN.make('org.dxos.type.person', '0.1.0'), props: {} },
  },
  from: { _tag: 'scope', scopes: [Scope.space({ id: spaceId })] },
});

/** Fake entry at the source boundary — only `id` is read by the aggregate under test. */
const entry = (id: string): SourceEntry => ({ id, result: { id } }) as unknown as SourceEntry;

/** A source that answers with fixed entries and reports fixed unresolved hits. */
const stubSource = (entries: SourceEntry[], unresolved: UnresolvedHit[] = []): QuerySource => ({
  changed: new Event<void>(),
  open: () => {},
  close: () => {},
  getResults: () => entries,
  isSynchronous: () => true,
  run: async () => entries,
  unresolvedHits: () => unresolved,
  update: () => {},
});

describe('GraphQueryContext', () => {
  const spaceId = SpaceId.random();

  const makeContext = (...sources: QuerySource[]): GraphQueryContext => {
    const context = new GraphQueryContext({ onStart: () => {}, onStop: () => {} });
    for (const source of sources) {
      context.addQuerySource(source);
    }
    return context;
  };

  // Regression: an index hit that reached no source used to leave the result short and silent, so a
  // one-shot caller read it as the whole set.
  test('run fails when an index hit reached no source', async () => {
    const found = EntityId.random();
    const missing = EntityId.random();
    const context = makeContext(stubSource([entry(found)], [{ id: missing, spaceId, reason: 'load-timeout' }]));

    const run = context.run(Context.default(), makeQuery(spaceId));
    await expect(run).rejects.toBeInstanceOf(QueryIncompleteError);
    await expect(run).rejects.toMatchObject({ unresolved: [{ id: missing, reason: 'load-timeout' }] });
  });

  // The object is in the answer, so the index source's failure to hydrate it cost the caller
  // nothing — a local working set routinely covers a hit the index source could not load.
  test('run succeeds when another source produced the unresolved object', async () => {
    const covered = EntityId.random();
    const context = makeContext(
      stubSource([], [{ id: covered, spaceId, reason: 'load-timeout' }]),
      stubSource([entry(covered)]),
    );

    const results = await context.run(Context.default(), makeQuery(spaceId));

    expect(results.map((result) => result.id)).toEqual([covered]);
  });
});
