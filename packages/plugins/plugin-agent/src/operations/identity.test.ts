//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import { canonicalKey, expandKeys, identityGroups } from './identity.ts';

const PERSON = 'echo://BEE4HEXQOEZUHFWSVTV7EZK4SIWZL6ON7/01M4WYRD4ZJ2C5YR2JX4GWWSN3';

const fact = (subject: string, predicate: string, object: RDF.Fact['assertion']['object']): RDF.Fact => ({
  id: `${subject}-${predicate}`,
  assertion: { subject: { kind: 'entity', entity: subject }, predicate, object },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'test', generatedAtTime: '2026-10-14T00:00:00Z' },
  recordedAt: '2026-10-14T00:00:00Z',
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: 'hash',
});

const entity = (key: string): RDF.Fact['assertion']['object'] => ({ kind: 'entity', entity: key });
const literal = (value: string): RDF.Fact['assertion']['object'] => ({ kind: 'literal', literal: value });

describe('identityGroups', () => {
  test('ties a roster person, their Discord account and their email address into one entity', ({ expect }) => {
    const facts = [
      // The roster resolved the name to the ECHO Person and named their Discord account.
      fact(PERSON, 'has-account', entity('dmaretskyi')),
      // Discord minted the speaker by their handle, and they gave their email address.
      fact('dmaretskyi', 'located in', entity('bangkok')),
      fact('dmaretskyi', 'has account', literal('dmytro@braneframe.com')),
    ];
    const keys = expandKeys([PERSON], identityGroups(facts));
    expect(keys).toContain('dmaretskyi');
    expect(keys).toContain(canonicalKey('dmytro@braneframe.com'));
    expect(keys).not.toContain('bangkok');
  });

  test("a person's identities link entities minted under them, with no fact saying so", ({ expect }) => {
    const groups = identityGroups([], [[PERSON, '@dmaretskyi', 'dmytro@braneframe.com']]);
    expect(expandKeys(['dmytro-braneframe-com'], groups)).toContain(PERSON);
    expect(expandKeys(['dmaretskyi'], groups)).toContain(PERSON);
  });

  test('an email predicate the ontology does not know still identifies', ({ expect }) => {
    const groups = identityGroups([fact('dmaretskyi', 'has email', literal('dmytro@braneframe.com'))]);
    expect(expandKeys(['dmytro@braneframe.com'], groups)).toContain('dmaretskyi');
  });

  test('a denied, uncertain or lapsed account link ties nothing', ({ expect }) => {
    const denied = fact(PERSON, 'has-account', entity('dmaretskyi'));
    const lapsed = fact(PERSON, 'has account', entity('old-handle'));
    const uncertain = fact(PERSON, 'has-account', entity('maybe-handle'));
    const groups = identityGroups(
      [
        { ...denied, factuality: { value: 'CT-', polarity: '-' } },
        { ...lapsed, assertion: { ...lapsed.assertion, validTo: '2026-01-01T00:00:00Z' } },
        { ...uncertain, factuality: { value: 'Uu', polarity: '?' } },
      ],
      [],
      '2026-10-14T00:00:00Z',
    );
    expect([...expandKeys([PERSON], groups)]).toEqual([PERSON]);
  });

  test('names and ordinary relations never merge entities', ({ expect }) => {
    const facts = [
      fact('dmytro', 'works at', entity('dxos')),
      fact('dmytro-maretskyi', 'works at', entity('dxos')),
      fact('rich', 'has account', entity('richburdon')),
    ];
    const keys = expandKeys(['dmytro'], identityGroups(facts));
    expect([...keys]).toEqual(['dmytro']);
    expect(expandKeys(['rich'], identityGroups(facts))).not.toContain('dmytro');
  });
});
