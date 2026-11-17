//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Ontology } from '@dxos/echo-memory';

import {
  type ClaimDecision,
  DEFAULT_THRESHOLDS,
  NEW,
  OTHER,
  claimDecisions,
  contextRule,
  entityChoices,
  factualityOf,
  isUnresolvedReference,
  offersAllPredicates,
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
    expect(offersAllPredicates(many, predicateChoices(many))).toBe(false);
    expect(offersAllPredicates(Ontology.DEFAULT, predicateChoices(Ontology.DEFAULT))).toBe(true);
  });

  test('a closed ontology past the choice limit sends "other" to the LLM, since it may be a listed predicate', ({
    expect,
  }) => {
    const other = { ...DECISION, predicate: { label: OTHER, confidence: 0.9 } };
    expect(route(other, { ...CLOSED, allPredicatesOffered: false })).toEqual({
      _tag: 'fallback',
      reason: 'unlisted-predicate',
    });
  });

  test('caller rules become a decision, and a claim outside them is dropped', ({ expect }) => {
    const claim = { text: 'Bob uses Redis', subject: 'Bob', object: 'Redis' };
    const decisions = claimDecisions(claim, 'bob', predicateChoices(Ontology.DEFAULT), new Map(), [
      'Extract only propositions about Alice.',
    ]);
    expect(decisions.follows_rules).toBeDefined();
    expect(claimDecisions(claim, 'bob', predicateChoices(Ontology.DEFAULT), new Map()).follows_rules).toBeUndefined();
    expect(route({ ...DECISION, followsRules: 0.1 }, OPEN)).toEqual({ _tag: 'drop', reason: 'outside-rules' });
    expect(route({ ...DECISION, followsRules: 0.9 }, OPEN)).toEqual({ _tag: 'accept' });
  });

  test('with caller rules, a decision that does not answer them goes to the LLM', ({ expect }) => {
    expect(route(DECISION, { ...OPEN, rulesRequired: true })).toEqual({ _tag: 'fallback', reason: 'unchecked-rules' });
    expect(route({ ...DECISION, followsRules: 0.9 }, { ...OPEN, rulesRequired: true })).toEqual({ _tag: 'accept' });
    expect(route({ ...DECISION, followsRules: 0.1 }, { ...OPEN, rulesRequired: true })).toEqual({
      _tag: 'drop',
      reason: 'outside-rules',
    });
  });

  test('an unlinked third-person reference goes to the LLM, which reads the earlier messages', ({ expect }) => {
    const claim = { text: 'She uses Redis', subject: 'She', object: 'Redis' };
    expect(route(DECISION, { ...OPEN, claim })).toEqual({ _tag: 'fallback', reason: 'unresolved-reference' });
    const entities = entityChoices([ALICE]);
    expect(route({ ...DECISION, subject: { label: NEW, confidence: 0.9 } }, { ...OPEN, claim, entities })).toEqual({
      _tag: 'fallback',
      reason: 'unresolved-reference',
    });
    expect(route({ ...DECISION, subject: { label: 'e0', confidence: 0.9 } }, { ...OPEN, claim, entities })).toEqual({
      _tag: 'accept',
    });
    expect(route(DECISION, { ...OPEN, claim: { ...claim, subject: 'Bob' } })).toEqual({ _tag: 'accept' });
    expect(isUnresolvedReference('that', undefined, { entities, thresholds: DEFAULT_THRESHOLDS })).toBe(true);
    expect(isUnresolvedReference('the launch', undefined, { entities, thresholds: DEFAULT_THRESHOLDS })).toBe(false);
  });

  test('the fallback reads earlier messages only to resolve references', ({ expect }) => {
    expect(contextRule('alice: I maintain Atlas')).toContain('alice: I maintain Atlas');
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
