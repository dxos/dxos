//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expectTypeOf, test } from 'vitest';

import * as Fact from './Fact.ts';
import * as MemoryQuery from './MemoryQuery.ts';
import * as Subscription from './Subscription.ts';

describe('MemoryQuery', () => {
  test('each constructor fixes its answer type', () => {
    expectTypeOf<MemoryQuery.ResultOf<MemoryQuery.Facts>>().toEqualTypeOf<readonly Fact.Fact[]>();
    expectTypeOf<MemoryQuery.ResultOf<ReturnType<typeof MemoryQuery.sparql>>>().toEqualTypeOf<
      readonly MemoryQuery.SparqlRow[]
    >();
    expectTypeOf<MemoryQuery.ResultOf<ReturnType<typeof MemoryQuery.cursor>>>().toEqualTypeOf<string | undefined>();
  });

  test('a query is plain JSON and decodes back by its tag', ({ expect }) => {
    const queries: MemoryQuery.Any[] = [
      MemoryQuery.facts({ entity: Fact.EntityKey.make('alice'), minConfidence: 0.5 }),
      MemoryQuery.graphs('SELECT ?g WHERE { GRAPH ?g { ?s ?p ?o } }'),
      MemoryQuery.sparql('SELECT ?s WHERE { ?s ?p ?o }'),
      MemoryQuery.predicates(),
      MemoryQuery.cursor(Fact.SourceUri.make('dxn:queue:space:chat')),
    ];
    for (const query of queries) {
      const json = JSON.parse(JSON.stringify(Schema.encodeSync(MemoryQuery.Any)(query)));
      expect(Schema.decodeUnknownSync(MemoryQuery.Any)(json)).toEqual(query);
    }
  });

  test('an answer decodes with the schema its tag names', ({ expect }) => {
    const rows = [{ s: { termType: 'NamedNode', value: 'https://example.com/alice' } }];
    const schema = MemoryQuery.resultOf(MemoryQuery.sparql('SELECT ?s WHERE { ?s ?p ?o }'));
    expect(Schema.decodeUnknownSync(schema)(JSON.parse(JSON.stringify(rows)))).toEqual(rows);
    expect(Schema.decodeUnknownSync(MemoryQuery.resultSchema('cursor'))(undefined)).toBeUndefined();
  });
});

describe('Subscription', () => {
  test('subscriptions and events are plain JSON', ({ expect }) => {
    const subscription = Schema.decodeUnknownSync(Subscription.Subscription)({
      id: 'alice.1',
      owner: 'alice',
      rules: 'wake(match) :- fact(F).',
      createdAt: '2026-11-16T00:00:00.000Z',
      payload: { notify: { recipient: { '/': 'echo://space/obj' }, message: 'hi' } },
    });
    const event = Schema.decodeUnknownSync(Subscription.MemoryEvent)({
      id: 'event-1',
      subscription: 'alice.1',
      label: 'match',
      facts: [],
      at: '2026-11-16T00:00:00.000Z',
    });
    for (const [schema, value] of [
      [Subscription.Subscription, subscription],
      [Subscription.MemoryEvent, event],
    ] as const) {
      const json = JSON.parse(JSON.stringify(Schema.encodeUnknownSync(schema)(value)));
      expect(Schema.decodeUnknownSync(schema)(json)).toEqual(value);
    }
  });
});
