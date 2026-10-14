//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Space } from '@dxos/halo';
import { type RDF } from '@dxos/pipeline-rdf';

import { TEST_MEMBERS } from '../brain/testing.ts';
import { type EntityIndex, knownEntities, resolveTerms } from './members.ts';

const DIMA = TEST_MEMBERS.dima;
const RICH = 'echo://SPACE/RICH';

const fact = (subject: string, object: string): RDF.Fact => ({
  id: 'f1',
  assertion: {
    subject: { kind: 'entity', entity: subject.toLowerCase(), label: subject },
    predicate: 'works with',
    object: { kind: 'entity', entity: object.toLowerCase(), label: object },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'doc', generatedAtTime: '2026-10-13T00:00:00Z' },
  recordedAt: '2026-10-13T00:00:00Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h',
});

describe('resolveTerms', () => {
  test('keys a member by DID, a person in the space by object URI, and leaves anyone else a slug', ({ expect }) => {
    const members: Space.Member[] = [{ did: DIMA, displayName: 'Dima', role: 'edit', online: true }];
    const entities: EntityIndex = new Map([['rich burdon', { uri: RICH, type: 'person', name: 'Rich Burdon' }]]);
    const resolved = resolveTerms(members, fact('Dima', 'Rich Burdon'), entities);
    expect(resolved.assertion.subject).toEqual({ kind: 'entity', entity: DIMA, label: 'Dima', type: 'person' });
    expect(resolved.assertion.object).toEqual({ kind: 'entity', entity: RICH, label: 'Rich Burdon', type: 'person' });
    expect(resolveTerms([], fact('Ann', 'Bob'), entities).assertion.object).toEqual({
      kind: 'entity',
      entity: 'bob',
      label: 'Bob',
    });
  });
});

describe('knownEntities', () => {
  test("lists members and the space's people by IRI, each name once", ({ expect }) => {
    const members: Space.Member[] = [{ did: DIMA, displayName: 'Dima', role: 'edit', online: true }];
    const entities: EntityIndex = new Map([
      ['rich burdon', { uri: RICH, type: 'person', name: 'Rich Burdon' }],
      ['rich', { uri: RICH, type: 'person', name: 'Rich' }],
    ]);
    expect(knownEntities(members, entities)).toEqual([
      { iri: DIMA, label: 'Dima', type: 'person' },
      { iri: RICH, label: 'Rich Burdon', type: 'person', aliases: ['Rich'] },
    ]);
  });
});
