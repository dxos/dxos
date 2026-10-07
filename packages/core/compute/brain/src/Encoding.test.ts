//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import * as Encoding from './Encoding.ts';
import * as Vocabulary from './Vocabulary.ts';

const REFUSAL: RDF.Fact = {
  id: 'fact-1',
  assertion: {
    subject: { kind: 'entity', entity: 'dima', label: 'Dima' },
    predicate: 'will-work-on',
    object: { kind: 'literal', literal: 'agent plugin' },
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
  pass: 'pass-1',
};

const MINIMAL: RDF.Fact = {
  id: 'fact-2',
  assertion: {
    subject: { kind: 'entity', entity: 'release' },
    predicate: 'shipped',
    object: { kind: 'literal', literal: 'npm' },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'dxn:queue:chat:msg-2', generatedAtTime: '2027-01-07T16:00:00.000Z' },
  recordedAt: '2027-01-07T16:00:01.000Z',
  extractor: { id: 'default', model: 'test', version: '1' },
  sourceHash: 'def',
};

const byRelation = (entries: ReadonlyArray<{ relation: string; tuple: ReadonlyArray<unknown> }>) =>
  Object.fromEntries(entries.map(({ relation, tuple }) => [relation, tuple]));

describe('Encoding', () => {
  test('encodes fact and metadata relations keyed by the fact id', ({ expect }) => {
    const entries = Encoding.encode(REFUSAL, Vocabulary.make(Vocabulary.DEFAULT_ENTRIES));
    const relations = byRelation(entries);
    expect(relations.fact).toEqual(['fact-1', 'dima', 'works_on', 'agent plugin']);
    expect(relations.surface).toEqual(['fact-1', 'will-work-on']);
    expect(relations.speaker).toEqual(['fact-1', 'dima']);
    expect(relations.saidAt).toEqual(['fact-1', '2027-01-05T10:00:00.000Z']);
    expect(relations.force).toEqual(['fact-1', 'commissive']);
    expect(relations.addressee).toEqual(['fact-1', 'rich']);
    expect(relations.polarity).toEqual(['fact-1', '-']);
    expect(relations.confidence).toEqual(['fact-1', 0.8]);
    expect(relations.supersedes).toEqual(['fact-1', 'fact-0']);
    expect(relations.pass).toEqual(['fact-1', 'pass-1']);
    expect(entries.every(({ relation, tuple }) => Encoding.RELATIONS[relation] === tuple.length)).toBe(true);
    expect(Encoding.factIds(entries)).toEqual(['fact-1']);
  });

  test('a fact without an illocution is assertive and omits absent fields', ({ expect }) => {
    const relations = byRelation(Encoding.encode(MINIMAL));
    expect(relations.force).toEqual(['fact-2', 'assertive']);
    expect(Object.keys(relations).sort()).toEqual(
      ['fact', 'factuality', 'force', 'polarity', 'recordedAt', 'saidAt', 'source', 'surface'].sort(),
    );
  });
});
