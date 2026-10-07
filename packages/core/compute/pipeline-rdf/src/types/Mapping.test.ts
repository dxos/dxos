//
// Copyright 2026 DXOS.org
//

import { DataFactory } from 'n3';
import { describe, test } from 'vitest';

import { type Fact } from './Fact.ts';
import * as Mapping from './Mapping.ts';

const FACT: Fact = {
  id: 'fact-1',
  assertion: {
    subject: { entity: 'alice' },
    predicate: 'travelsTo',
    object: { entity: 'paris' },
    validFrom: '2026-06-12',
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
  attribution: { agent: 'alice', source: 'dxn:queue:x:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
};

describe('fact ↔ triples mapping', () => {
  test('round-trips a fact through reified triples', ({ expect }) => {
    const quads = Mapping.factToTriples(FACT);
    expect(quads.length).toBeGreaterThan(5);
    const [back] = Mapping.triplesToFacts(quads);
    expect(back).toEqual(FACT);
  });

  test('round-trips a fact with a literal object and no agent', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-2',
      assertion: { subject: { entity: 'meeting' }, predicate: 'scheduledFor', object: { literal: '2026-07-15' } },
      attribution: { source: 'dxn:queue:x:m3', generatedAtTime: '2026-06-08T00:00:00.000Z' },
    };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('round-trips a fact with wasDerivedFrom and span', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-3',
      attribution: {
        source: 'dxn:queue:x:m4',
        generatedAtTime: '2026-06-09T00:00:00.000Z',
        wasDerivedFrom: ['dxn:a', 'dxn:b'],
        span: { start: 0, end: 12 },
      },
    };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('round-trips entity display labels (preserving surface casing)', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-4',
      assertion: {
        subject: { entity: 'dxos', label: 'DXOS' },
        predicate: 'is',
        object: { entity: 'open-source-project', label: 'an open source project' },
      },
    };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('omits illocution triples when the fact has no illocution', ({ expect }) => {
    const quads = Mapping.factToTriples(FACT);
    const names = quads.map((quad) => quad.predicate.value);
    expect(names.some((name) => /#(force|mood|addressee)$/.test(name))).toBe(false);
    const [back] = Mapping.triplesToFacts(quads);
    expect(back.illocution).toBeUndefined();
  });

  test('round-trips a full illocution (force, mood, addressee)', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-5',
      illocution: { force: 'directive', mood: 'interrogative', addressee: 'bob' },
    };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('round-trips an illocution with only force', ({ expect }) => {
    const fact: Fact = { ...FACT, id: 'fact-6', illocution: { force: 'commissive' } };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('round-trips an illocution with force and mood only', ({ expect }) => {
    const fact: Fact = { ...FACT, id: 'fact-7', illocution: { force: 'directive', mood: 'imperative' } };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('round-trips an illocution with force and addressee only', ({ expect }) => {
    const fact: Fact = { ...FACT, id: 'fact-8', illocution: { force: 'expressive', addressee: 'carol@example.com' } };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('rejects an invalid stored force', ({ expect }) => {
    const quads = Mapping.factToTriples({ ...FACT, illocution: { force: 'assertive' } }).map((quad) =>
      quad.predicate.value.endsWith('#force')
        ? DataFactory.quad(quad.subject, quad.predicate, DataFactory.literal('bogus'), quad.graph)
        : quad,
    );
    expect(() => Mapping.triplesToFacts(quads)).toThrow();
  });

  test('throws when a required predicate triple is missing', ({ expect }) => {
    const quads = Mapping.factToTriples(FACT).filter((quad) => !quad.predicate.value.endsWith('#predicate'));
    expect(() => Mapping.triplesToFacts(quads)).toThrow();
  });
});
