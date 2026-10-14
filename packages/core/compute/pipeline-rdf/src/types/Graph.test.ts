//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Fact } from './Fact.ts';
import * as Graph from './Graph.ts';
import * as Mapping from './Mapping.ts';
import * as Ontology from './Ontology.ts';
import * as Vocab from './Vocab.ts';

const fact = (id: string, quote: string, object = 'founder'): Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: 'rich', label: 'Rich' },
    predicate: 'has role',
    object: { kind: 'entity', entity: object },
    quote,
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'https://dxos.org/team', generatedAtTime: '2026-10-13T00:00:00Z' },
  recordedAt: '2026-10-13T00:00:00Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h',
});

describe('Graph', () => {
  test('statements with the same provenance share a graph; a different quote starts another', ({ expect }) => {
    const [first, second, third] = Graph.assign([
      fact('a', 'Rich is the founder and CEO.'),
      fact('b', 'Rich is the founder and CEO.', 'ceo'),
      fact('c', 'Rich leads product.', 'product-lead'),
    ]);
    expect(first.graph).toBe(second.graph);
    expect(third.graph).not.toBe(first.graph);
    expect(first.graph).toMatch(/^https:\/\/dxos\.org\/semantic\/graph\//);
    expect(first.assertion.predicateIri).toBe('https://schema.org/jobTitle');
  });

  test('a graph is superseded or retracted by a later one', ({ expect }) => {
    const [old, other] = Graph.assign([fact('a', 'one'), fact('b', 'two')]);
    const [replacement] = Graph.assign([{ ...fact('c', 'three'), supersedes: [old.graph!] }]);
    const [withdrawal] = Graph.assign([{ ...fact('d', 'four'), retracts: [other.graph!] }]);
    const statuses = Graph.status([old, other, replacement, withdrawal]);
    expect(statuses.get(old.graph!)).toBe('superseded');
    expect(statuses.get(other.graph!)).toBe('retracted');
    expect(statuses.get(replacement.graph!)).toBe('active');
  });

  test('writes TriG: the statement inside its graph, the provenance about it', ({ expect }) => {
    const trig = Graph.toTriG(Graph.assign([fact('a', 'Rich is the founder.')]));
    expect(trig).toContain('g1:rich schema:jobTitle g1:founder');
    expect(trig).toMatch(/graph:[^\s]+ \{/);
    expect(trig).toContain('sx:quote "Rich is the founder."');
  });

  test('an unresolved entity is local to its graph; a stable IRI is shared', ({ expect }) => {
    const [first, second] = Graph.assign([fact('a', 'Rich is the founder.'), fact('b', 'Rich founded DXOS.')]);
    const subjects = [first, second].map((placed) => Mapping.factToTriples(placed)[0].subject.value);
    expect(subjects[0]).toBe(`${first.graph}#rich`);
    expect(subjects[1]).toBe(`${second.graph}#rich`);

    const resolved = (placed: Fact): Fact => ({
      ...placed,
      assertion: { ...placed.assertion, subject: { kind: 'entity', entity: 'echo://SPACE/RICH', label: 'Rich' } },
    });
    const shared = [first, second].map((placed) => Mapping.factToTriples(resolved(placed))[0].subject.value);
    expect(shared).toEqual(['echo://SPACE/RICH', 'echo://SPACE/RICH']);
    // Read back, the local entity is its slug again.
    expect(Mapping.triplesToFacts(Mapping.factToTriples(first))[0].assertion.subject).toEqual(first.assertion.subject);
  });

  test("a minted predicate is described in the ontology graph, outside the statement's graph", ({ expect }) => {
    const ontology = Ontology.DEFAULT.withNamespace(Vocab.brainNamespace('agent-1'));
    const [placed] = Graph.assign(
      [
        {
          ...fact('a', 'Rich mentors Dima.', 'dima'),
          assertion: {
            ...fact('a', 'Rich mentors Dima.', 'dima').assertion,
            predicate: 'mentors',
            predicateDescription: 'A person the subject guides in their work.',
          },
        },
      ],
      { ontology },
    );
    expect(placed.assertion.predicateIri).toBe('https://dxos.org/semantic/brain/agent-1/mentor');
    const quads = Mapping.factToTriples(placed, ontology);
    const definition = quads.filter((quad) => quad.subject.value === placed.assertion.predicateIri);
    expect(definition.every((quad) => quad.graph.value === Vocab.ONTOLOGY_GRAPH)).toBe(true);
    expect(Ontology.fromQuads(definition)).toEqual([
      {
        iri: 'https://dxos.org/semantic/brain/agent-1/mentor',
        name: 'mentor',
        label: 'mentors',
        description: 'A person the subject guides in their work.',
        definedBy: 'https://dxos.org/semantic/brain/agent-1/',
      },
    ]);
    expect(Graph.toTriG([placed], ontology)).toContain('brain:mentor');
  });
});
