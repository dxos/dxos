//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { RDF } from '@dxos/pipeline-rdf';

import * as Knowledge from './Knowledge.ts';

const AGENT = 'did:halo:agent';
const RICH = { id: 'echo://SPACE/RICH', label: 'Rich', type: 'person' } as const;
const DXOS = { id: 'echo://SPACE/DXOS', label: 'DXOS', type: 'org' } as const;

/** Through the store's own mapping, so the memory survives what the brain does to it. */
const stored = (facts: readonly RDF.Fact[]): RDF.Fact[] =>
  RDF.Mapping.triplesToFacts(facts.flatMap((fact) => RDF.Mapping.factToTriples(fact)));

describe('Knowledge', () => {
  test('a memory is one graph claiming its content about each subject', ({ expect }) => {
    const facts = Knowledge.toFacts({
      content: 'Rich leads the Composer team at DXOS.',
      kind: 'relationship',
      subjects: [RICH, DXOS],
      agent: AGENT,
      observedAt: '2026-10-13T00:00:00Z',
    });
    expect(facts).toHaveLength(2);
    expect(new Set(facts.map((fact) => fact.graph)).size).toBe(1);
    // An entity id, not a hash of the time it was recorded, so a replayed run gets the same id.
    expect(facts[0].graph).toMatch(/^https:\/\/dxos\.org\/semantic\/graph\/memory-/);
    expect(facts[0].assertion.predicateIri).toBe(Knowledge.CLAIM);

    const [memory] = Knowledge.fromFacts(stored(facts));
    expect(memory).toEqual({
      id: facts[0].graph,
      content: 'Rich leads the Composer team at DXOS.',
      kind: 'relationship',
      origin: 'stated',
      observedAt: '2026-10-13T00:00:00Z',
      status: 'active',
      subjects: [RICH.id, DXOS.id],
    });
  });

  test('a correction supersedes, a retraction withdraws, and neither overwrites', ({ expect }) => {
    const original = Knowledge.toFacts({
      content: 'Rich prefers weekly updates.',
      kind: 'preference',
      subjects: [RICH],
      agent: AGENT,
    });
    const [first] = Knowledge.fromFacts(original);
    const correction = Knowledge.toFacts({
      content: 'Rich prefers daily standups.',
      kind: 'preference',
      subjects: [RICH],
      agent: AGENT,
      supersedes: first.id,
    });
    const other = Knowledge.toFacts({ content: 'Rich lives in Paris.', kind: 'fact', subjects: [RICH], agent: AGENT });
    const [mistake] = Knowledge.fromFacts(other);

    const memories = Knowledge.fromFacts(
      stored([...original, ...correction, ...other, ...Knowledge.retract(mistake, AGENT)]),
    );
    expect(memories.map(({ content, status }) => [content, status]).sort()).toEqual([
      ['Rich lives in Paris.', 'retracted'],
      ['Rich prefers daily standups.', 'active'],
      ['Rich prefers weekly updates.', 'superseded'],
    ]);
  });

  test('a note keeps its markdown body', ({ expect }) => {
    const facts = Knowledge.toFacts({
      content: 'Notes on the migration.',
      kind: 'note',
      subjects: [RICH],
      agent: AGENT,
      body: '- Take the write lock first.',
    });
    expect(Knowledge.fromFacts(stored(facts))[0].body).toBe('- Take the write lock first.');
  });
});
