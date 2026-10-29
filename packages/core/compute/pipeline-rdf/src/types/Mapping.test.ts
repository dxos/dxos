//
// Copyright 2026 DXOS.org
//

import { DataFactory } from 'n3';
import { describe, test } from 'vitest';

import { type Fact } from './Fact.ts';
import * as Graph from './Graph.ts';
import * as Mapping from './Mapping.ts';
import * as Vocab from './Vocab.ts';

/** A fact as stored: its predicate carries the IRI it resolved to. */
const stored = (fact: Fact): Fact => ({
  ...fact,
  assertion: { ...fact.assertion, predicateIri: Mapping.predicateOf(fact) },
});

const FACT: Fact = {
  id: 'fact-1',
  assertion: {
    subject: { kind: 'entity', entity: 'alice' },
    predicate: 'travelsTo',
    object: { kind: 'entity', entity: 'paris' },
    validFrom: '2026-06-12',
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
  attribution: { agent: 'alice', source: 'dxn:queue:x:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
};

describe('fact <-> quads mapping', () => {
  test('round-trips a fact through its own graph', ({ expect }) => {
    const quads = Mapping.factToTriples(FACT);
    expect(quads.length).toBeGreaterThan(5);
    const [back] = Mapping.triplesToFacts(quads);
    expect(back).toEqual(stored(FACT));
  });

  test('round-trips a fact with a literal object and no agent', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-2',
      assertion: {
        subject: { kind: 'entity', entity: 'meeting' },
        predicate: 'scheduledFor',
        object: { kind: 'literal', literal: '2026-07-15' },
      },
      attribution: { source: 'dxn:queue:x:m3', generatedAtTime: '2026-06-08T00:00:00.000Z' },
    };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(stored(fact));
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
    expect(back).toEqual(stored(fact));
  });

  test('round-trips the extraction pass', ({ expect }) => {
    const fact: Fact = { ...FACT, id: 'fact-pass', pass: 'pass-1' };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(stored(fact));
  });

  test('round-trips entity display labels (preserving surface casing)', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-4',
      assertion: {
        subject: { kind: 'entity', entity: 'dxos', label: 'DXOS' },
        predicate: 'is',
        object: { kind: 'entity', entity: 'open-source-project', label: 'an open source project' },
      },
    };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(stored(fact));
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
    expect(back).toEqual(stored(fact));
  });

  test('round-trips an illocution with only force', ({ expect }) => {
    const fact: Fact = { ...FACT, id: 'fact-6', illocution: { force: 'commissive' } };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(stored(fact));
  });

  test('round-trips an illocution with force and mood only', ({ expect }) => {
    const fact: Fact = { ...FACT, id: 'fact-7', illocution: { force: 'directive', mood: 'imperative' } };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(stored(fact));
  });

  test('round-trips an illocution with force and addressee only', ({ expect }) => {
    const fact: Fact = { ...FACT, id: 'fact-8', illocution: { force: 'expressive', addressee: 'carol@example.com' } };
    const [back] = Mapping.triplesToFacts(Mapping.factToTriples(fact));
    expect(back).toEqual(stored(fact));
  });

  test('rejects an invalid stored force', ({ expect }) => {
    const quads = Mapping.factToTriples({ ...FACT, illocution: { force: 'assertive' } }).map((quad) =>
      quad.predicate.value.endsWith('#force')
        ? DataFactory.quad(quad.subject, quad.predicate, DataFactory.literal('bogus'), quad.graph)
        : quad,
    );
    expect(() => Mapping.triplesToFacts(quads)).toThrow();
  });

  test('throws when required provenance is missing', ({ expect }) => {
    const quads = Mapping.factToTriples(FACT).filter((quad) => !quad.predicate.value.endsWith('#factuality'));
    expect(() => Mapping.triplesToFacts(quads)).toThrow();
  });

  test('stores the statement as a triple in the graph, and its provenance about the graph', ({ expect }) => {
    const quads = Mapping.factToTriples(FACT);
    const graph = Vocab.factIri(FACT.id).value;
    expect(
      quads.filter((quad) => quad.graph.value === graph && quad.predicate.value === Mapping.predicateOf(FACT)),
    ).toHaveLength(1);
    expect(
      quads.find((quad) => quad.predicate.value.endsWith('#quote') || quad.predicate.value.endsWith('#factuality'))
        ?.subject.value,
    ).toBe(graph);
  });

  test('keeps an IRI entity as itself, and its label and kind in the graph', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-iri',
      assertion: {
        subject: { kind: 'entity', entity: 'echo://SPACE/RICH', label: 'Rich Burdon', type: 'person' },
        predicate: 'has role',
        object: { kind: 'entity', entity: 'founder', label: 'Founder' },
      },
      attribution: { agent: 'did:key:z6Mk', source: 'https://dxos.org/team', generatedAtTime: '2026-10-13T00:00:00Z' },
    };
    const quads = Mapping.factToTriples(fact);
    expect(quads[0].subject.value).toBe('echo://SPACE/RICH');
    expect(quads[0].predicate.value).toBe('https://schema.org/jobTitle');
    // A slug is local to the graph that mentions it.
    expect(quads[0].object.value).toBe(`${Vocab.factIri('fact-iri').value}#founder`);
    const [back] = Mapping.triplesToFacts(quads);
    expect(back.assertion.subject).toEqual(fact.assertion.subject);
    expect(back.assertion.object).toEqual(fact.assertion.object);
    expect(back.attribution.agent).toBe('did:key:z6Mk');
    // A known predicate reads back as the ontology's label.
    expect(back.assertion.predicate).toBe('has role');
  });

  test('a graph holds several statements, each its own fact, sharing the provenance', ({ expect }) => {
    const [first, second] = Graph.assign([
      FACT,
      {
        ...FACT,
        id: 'other',
        assertion: { ...FACT.assertion, predicate: 'manages', object: { kind: 'entity', entity: 'bob' } },
      },
    ]);
    expect(first.graph).toBe(second.graph);
    expect(first.id).not.toBe(second.id);
    const back = Mapping.triplesToFacts([...Mapping.factToTriples(first), ...Mapping.factToTriples(second)]);
    expect(back).toEqual([first, second]);
  });
});
