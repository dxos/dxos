//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { RDF } from '@dxos/pipeline-rdf';

import * as Encoding from './Encoding.ts';
import * as FactTuple from './FactTuple.ts';
import * as Vocabulary from './Vocabulary.ts';

const REFUSAL: RDF.Fact = {
  id: 'fact-1',
  assertion: {
    subject: { entity: 'dima', label: 'Dima' },
    predicate: 'will-work-on',
    object: { literal: 'agent plugin' },
    validFrom: '2027-01-05',
    validTo: '2027-01-12',
    quote: "I'm busy this week, can't help with the agent plugin",
  },
  factuality: { value: 'CT-', polarity: '-', confidence: 0.8, nature: 'epistemic' },
  illocution: { force: 'commissive', mood: 'declarative', addressee: 'rich' },
  attribution: {
    agent: 'dima',
    source: 'dxn:queue:chat:msg-1',
    generatedAtTime: '2027-01-05T10:00:00.000Z',
    wasDerivedFrom: ['fact-0'],
    span: { start: 0, end: 52 },
  },
  recordedAt: '2027-01-05T10:00:05.000Z',
  extractor: { id: 'default', model: 'test', version: '1' },
  sourceHash: 'abc',
};

const MINIMAL: RDF.Fact = {
  id: 'fact-2',
  assertion: { subject: { entity: 'release' }, predicate: 'shipped', object: { literal: 'npm' } },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'dxn:queue:chat:msg-2', generatedAtTime: '2027-01-07T16:00:00.000Z' },
  recordedAt: '2027-01-07T16:00:01.000Z',
  extractor: { id: 'default', model: 'test', version: '1' },
  sourceHash: 'def',
};

describe('FactTuple', () => {
  test.for([
    ['every field', REFUSAL],
    ['no optional fields', MINIMAL],
  ] as const)('round-trips a pipeline-rdf Fact with %s', ([, fact], { expect }) => {
    const tuple = FactTuple.fromFact(fact, { pass: 'pass-1' });
    expect(Schema.decodeUnknownSync(FactTuple.FactTuple)(JSON.parse(JSON.stringify(tuple)))).toEqual(tuple);
    const restored = FactTuple.toFact(tuple);
    expect(restored).toStrictEqual(fact);
    expect(Schema.decodeUnknownSync(RDF.Fact)(restored)).toStrictEqual(fact);
  });

  test('defaults force to assertive', ({ expect }) => {
    expect(FactTuple.fromFact(MINIMAL, { pass: 'p' }).force).toBe('assertive');
    const bare = FactTuple.toFact(
      FactTuple.fromFact({ ...MINIMAL, illocution: { force: 'assertive' } }, { pass: 'p' }),
    );
    expect(bare.illocution).toBeUndefined();
  });

  test('encodes fact and metadata relations keyed by the tuple id', ({ expect }) => {
    const tuple = FactTuple.fromFact(REFUSAL, { pass: 'pass-1' });
    const entries = Encoding.encode(tuple, Vocabulary.make(Vocabulary.DEFAULT_ENTRIES));
    const byRelation = Object.fromEntries(entries.map(({ relation, tuple }) => [relation, tuple]));
    expect(byRelation.fact).toEqual(['fact-1', 'dima', 'works_on', 'agent plugin']);
    expect(byRelation.surface).toEqual(['fact-1', 'will-work-on']);
    expect(byRelation.speaker).toEqual(['fact-1', 'dima']);
    expect(byRelation.force).toEqual(['fact-1', 'commissive']);
    expect(byRelation.polarity).toEqual(['fact-1', '-']);
    expect(byRelation.confidence).toEqual(['fact-1', 0.8]);
    expect(byRelation.supersedes).toEqual(['fact-1', 'fact-0']);
    expect(entries.every(({ relation, tuple }) => Encoding.RELATIONS[relation] === tuple.length)).toBe(true);
    expect(Encoding.factIds(entries)).toEqual(['fact-1']);
  });
});
