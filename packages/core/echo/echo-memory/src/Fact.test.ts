//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Fact from './Fact.ts';

/** A fact as `@dxos/pipeline-rdf` writes it today: plain strings, no brands. */
const STORED = {
  id: 'fact-1',
  graph: 'https://dxos.org/semantic/graph/g1',
  assertion: {
    subject: { kind: 'entity', entity: 'alice', label: 'Alice', type: 'person' },
    predicate: 'joins',
    object: { kind: 'entity', entity: 'acme' },
    validFrom: '2026-01-01',
    quote: 'I think Alice will probably join Acme in January.',
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.7 },
  attribution: { agent: 'bob', source: 'dxn:queue:space:msg-1', generatedAtTime: '2026-11-03T10:00:00.000Z' },
  recordedAt: '2026-11-16T10:00:00.000Z',
  extractor: { id: 'default', model: 'model', version: '1' },
  sourceHash: 'abc',
};

const make = (overrides: Partial<Fact.Fact> = {}): Fact.Fact => ({ ...Fact.decode([STORED])[0], ...overrides });

describe('Fact', () => {
  test('a fact stored before the move decodes unchanged', ({ expect }) => {
    const [fact] = Fact.decode([STORED]);
    expect(fact).toEqual(STORED);
  });

  test('the encoded form is plain JSON', ({ expect }) => {
    const fact = make();
    const json = JSON.parse(JSON.stringify(Schema.encodeSync(Fact.Fact)(fact)));
    expect(Schema.decodeUnknownSync(Fact.Fact)(json)).toEqual(fact);
  });

  test('a malformed fact fails to decode', ({ expect }) => {
    expect(() => Fact.decode([{ ...STORED, factuality: { value: 'XX', polarity: '+' } }])).toThrow();
  });

  test('currentFacts drops superseded, retracted, expired and free-text graphs', ({ expect }) => {
    const graph = (name: string) => Fact.GraphIri.make(`https://dxos.org/semantic/graph/${name}`);
    const kept = make({ id: Fact.FactId.make('kept'), graph: graph('kept') });
    const superseded = make({ id: Fact.FactId.make('old'), graph: graph('old') });
    const retracted = make({ id: Fact.FactId.make('gone'), graph: graph('gone') });
    const reviser = make({
      id: Fact.FactId.make('new'),
      graph: graph('new'),
      supersedes: [graph('old')],
      retracts: [graph('gone')],
    });
    const expired = make({
      id: Fact.FactId.make('expired'),
      graph: graph('expired'),
      assertion: { ...STORED_ASSERTION, validTo: '2026-01-01' },
    });
    const memory = make({ id: Fact.FactId.make('memory'), graph: graph('memory'), kind: 'preference' });

    const current = Fact.currentFacts([kept, superseded, retracted, reviser, expired, memory], '2026-11-16T00:00:00Z');
    expect(current.map(({ id }) => id)).toEqual(['kept', 'new']);
  });

  test('factText reads a fact as one line', ({ expect }) => {
    expect(Fact.factText(make())).toBe('Alice joins acme');
    expect(Fact.factText(make({ factuality: { value: 'CT-', polarity: '-' } }))).toBe('not: Alice joins acme');
  });
});

const STORED_ASSERTION = Fact.decode([STORED])[0].assertion;
