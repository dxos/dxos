//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Fact } from './Fact.ts';
import * as Graph from './Graph.ts';

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
    expect(first.assertion.predicateIri).toBe('https://dxos.org/ontology/hasRole');
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
    expect(trig).toContain('dx:hasRole');
    expect(trig).toMatch(/graph:[^\s]+ \{/);
    expect(trig).toContain('sx:quote "Rich is the founder."');
  });
});
