//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Ontology } from '../../types/index.ts';
import {
  type ClaimDecision,
  DEFAULT_THRESHOLDS,
  NEW,
  OTHER,
  entityChoices,
  factualityOf,
  predicateChoices,
  route,
  surfaceOf,
  toCandidate,
  toClaimDecision,
} from './system-one.ts';

const DECISION: ClaimDecision = {
  isFact: 0.9,
  needsFallback: 0.1,
  predicate: { label: 'works_on', confidence: 0.8 },
  speechAct: 'statement',
  certainty: 'certain',
  negated: 0.05,
};

const OPEN = { thresholds: DEFAULT_THRESHOLDS, closed: false };
const CLOSED = { thresholds: DEFAULT_THRESHOLDS, closed: true };

const ALICE = { iri: 'https://discord.com/users/1', label: 'Alice', aliases: ['alice_42'] };

describe('route', () => {
  test('a confident listed predicate is kept', ({ expect }) => {
    expect(route(DECISION, OPEN)).toEqual({ _tag: 'accept' });
  });

  test('filler is dropped whatever its predicate', ({ expect }) => {
    expect(route({ ...DECISION, isFact: 0.2, predicate: { label: OTHER, confidence: 1 } }, OPEN)).toEqual({
      _tag: 'drop',
      reason: 'not-a-fact',
    });
  });

  test('an unlisted relation goes to the LLM, or is dropped when the ontology is closed', ({ expect }) => {
    const other = { ...DECISION, predicate: { label: OTHER, confidence: 0.9 } };
    expect(route(other, OPEN)).toEqual({ _tag: 'fallback', reason: 'unlisted-predicate' });
    expect(route(other, CLOSED)).toEqual({ _tag: 'drop', reason: 'unlisted-predicate' });
  });

  test('a low-confidence predicate goes to the LLM, closed or not', ({ expect }) => {
    const unsure = { ...DECISION, predicate: { label: 'works_on', confidence: 0.4 } };
    expect(route(unsure, OPEN)).toEqual({ _tag: 'fallback', reason: 'low-confidence' });
    expect(route(unsure, CLOSED)).toEqual({ _tag: 'fallback', reason: 'low-confidence' });
  });

  test('the model flagging a claim sends it to the LLM', ({ expect }) => {
    expect(route({ ...DECISION, needsFallback: 0.7 }, OPEN)).toEqual({ _tag: 'fallback', reason: 'flagged' });
  });

  test('thresholds are configurable', ({ expect }) => {
    const strict = { thresholds: { ...DEFAULT_THRESHOLDS, minPredicateConfidence: 0.9 }, closed: false };
    expect(route(DECISION, strict)).toEqual({ _tag: 'fallback', reason: 'low-confidence' });
    const lax = { thresholds: { ...DEFAULT_THRESHOLDS, maxNeedsFallback: 0.95 }, closed: false };
    expect(route({ ...DECISION, needsFallback: 0.7 }, lax)).toEqual({ _tag: 'accept' });
  });
});

describe('choices', () => {
  test('predicates leave out deprecated entries and stay within the choice limit with room for other', ({ expect }) => {
    const iri = (name: string) => Ontology.DEFAULT.find(name)?.iri ?? '';
    const merged = Ontology.DEFAULT.merge(iri('knows_about'), iri('about'));
    expect(predicateChoices(merged).has('knows_about')).toBe(false);
    expect(predicateChoices(merged).has('about')).toBe(true);

    const many = Ontology.make(Array.from({ length: 300 }, (_, index) => Ontology.entry(`relation_${index}`)));
    expect(predicateChoices(many).size).toBe(254);
  });

  test('entities are keyed for the choice', ({ expect }) => {
    expect([...entityChoices([ALICE])]).toEqual([['e0', ALICE]]);
  });
});

describe('reading answers', () => {
  test('a confidently linked mention takes the entity label; a first-person one the author', ({ expect }) => {
    const entities = entityChoices([ALICE]);
    const linking = { entities, author: 'Bob', thresholds: DEFAULT_THRESHOLDS };
    expect(surfaceOf('she', { label: 'e0', confidence: 0.9 }, linking)).toBe('Alice');
    expect(surfaceOf('she', { label: 'e0', confidence: 0.3 }, linking)).toBe('she');
    expect(surfaceOf('the tools list', { label: NEW, confidence: 0.9 }, linking)).toBe('the tools list');
    expect(surfaceOf('I', undefined, linking)).toBe('Bob');
  });

  test('questions and requests are uncommitted; hedging and negation set the factuality', ({ expect }) => {
    expect(factualityOf({ speechAct: 'question', certainty: 'certain', negated: 0 })).toEqual({
      factuality: 'Uu',
      polarity: '?',
    });
    expect(factualityOf({ speechAct: 'statement', certainty: 'probable', negated: 0 })).toEqual({
      factuality: 'PR+',
      polarity: '+',
    });
    expect(factualityOf({ speechAct: 'statement', certainty: 'certain', negated: 0.9 })).toEqual({
      factuality: 'CT-',
      polarity: '-',
    });
  });

  test('answers without a predicate are no decision; stray labels read as defaults', ({ expect }) => {
    expect(toClaimDecision({ is_fact: { probability: 1 } })).toBeUndefined();
    const decision = toClaimDecision({
      predicate: { label: 'works_on', probabilities: { works_on: 0.7, other: 0.3 } },
      speech_act: { label: 'shout', probabilities: { shout: 1 } },
    });
    expect(decision).toMatchObject({
      predicate: { label: 'works_on', confidence: 0.7 },
      speechAct: 'statement',
      certainty: 'certain',
      isFact: 1,
    });
  });

  test('an accepted claim becomes a candidate in the LLM extractor shape', ({ expect }) => {
    const candidate = toCandidate(
      { text: 'I am asking Alice about the launch', subject: 'I', object: 'Alice' },
      {
        ...DECISION,
        predicate: { label: 'asked', confidence: 0.8 },
        speechAct: 'question',
        object: { label: 'e0', confidence: 0.9 },
      },
      {
        predicates: predicateChoices(Ontology.DEFAULT),
        entities: entityChoices([ALICE]),
        author: 'Bob',
        thresholds: DEFAULT_THRESHOLDS,
        graph: 'c0',
      },
    );
    expect(candidate).toEqual({
      subject: 'Bob',
      predicate: 'asked',
      object: 'Alice',
      factuality: 'Uu',
      polarity: '?',
      force: 'directive',
      mood: 'interrogative',
      confidence: 0.8,
      quote: 'I am asking Alice about the launch',
      graph: 'c0',
    });
  });
});
