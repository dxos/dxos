//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { type ScriptedAnswer, systemOneAiService } from '../testing/system-one.ts';
import { type ExtractDocument, type ExtractOptions, Ontology } from '../types/index.ts';
import { extractDocFacts, extractSystemOneDocFacts } from './extract-facts.ts';

const MYKOLA = { iri: 'https://discord.com/users/1', label: 'Mykola', type: 'person' as const };

const DOC: ExtractDocument = {
  text: 'I fixed the unit tests and now I am juggling our tools list.',
  source: 'discord:1',
  author: 'Mykola',
};

const OPTIONS: ExtractOptions = { extractor: 'system-one', entities: [MYKOLA] };

const CLAIMS = ['I fixed the unit tests', 'I am juggling our tools list'];

const ROLES: Record<string, { subject: string; object: string }> = {
  'Mykola: I fixed the unit tests': { subject: 'I', object: 'the unit tests' },
  'Mykola: I am juggling our tools list': { subject: 'I', object: 'our tools list' },
};

const clairic = (state: string) => (state === `Mykola: ${DOC.text}` ? { claims: CLAIMS } : (ROLES[state] ?? {}));

const BASE: Record<string, ScriptedAnswer> = {
  is_fact: 0.95,
  needs_fallback: 0.05,
  speech_act: 'statement',
  certainty: 'certain',
  negated: 0.02,
  subject_entity: { label: 'e0', confidence: 0.97 },
  object_entity: { label: 'new', confidence: 0.9 },
};

/** `completed` for the first claim; the second has no listed predicate. */
const clef = (state: unknown): Record<string, ScriptedAnswer> => ({
  ...BASE,
  predicate:
    typeof state === 'object' && state !== null && 'claim' in state && state.claim === CLAIMS[0]
      ? { label: 'completed', confidence: 0.85 }
      : { label: 'other', confidence: 0.8 },
});

const FALLBACK = {
  facts: [{ subject: 'Mykola', predicate: 'juggles', object: 'tools list', factuality: 'CT+', polarity: '+' }],
};

describe('System One extraction', () => {
  it.effect(
    'keeps the confident claim, links the author by IRI, and sends only the unlisted one to the LLM',
    Effect.fnUntraced(function* () {
      const prompts: unknown[] = [];
      const { facts, report } = yield* extractSystemOneDocFacts(DOC, OPTIONS).pipe(
        Effect.provide(systemOneAiService({ extract: clairic, decide: clef, fallback: [FALLBACK], prompts })),
      );

      const [systemOne, fallback] = facts;
      expect(systemOne.extractor.id).toBe('system-one');
      expect(systemOne.assertion.subject).toMatchObject({ entity: MYKOLA.iri });
      expect(systemOne.assertion.predicateIri).toBe(Ontology.DEFAULT.find('completed')?.iri);
      expect(systemOne.assertion.quote).toBe(CLAIMS[0]);
      expect(fallback.extractor.id).toBe('system-one-fallback');
      expect(fallback.assertion.subject).toMatchObject({ entity: MYKOLA.iri });

      // The fallback reads only the uncertain clause, with the message as context.
      expect(prompts).toHaveLength(1);
      expect(String(prompts[0])).toContain(`Message:\n${CLAIMS[1]}`);
      expect(String(prompts[0])).toContain('Full message');

      expect(report).toMatchObject({ claims: 2, accepted: 1, fallbackClaims: 1, fallbackCalls: 1, dropped: 0 });
    }),
  );

  it.effect(
    'a closed ontology drops the unlisted relation without calling the LLM',
    Effect.fnUntraced(function* () {
      const facts = yield* extractDocFacts(DOC, { ...OPTIONS, closed: true }).pipe(
        Effect.provide(systemOneAiService({ extract: clairic, decide: clef })),
      );
      expect(facts.map(({ extractor }) => extractor.id)).toEqual(['system-one']);
    }),
  );

  it.effect(
    'a message Clairic finds no claims in goes to the LLM whole',
    Effect.fnUntraced(function* () {
      const prompts: unknown[] = [];
      const { facts, report } = yield* extractSystemOneDocFacts(DOC, OPTIONS).pipe(
        Effect.provide(systemOneAiService({ extract: () => ({}), decide: clef, fallback: [FALLBACK], prompts })),
      );
      expect(facts.map(({ extractor }) => extractor.id)).toEqual(['system-one-fallback']);
      expect(String(prompts[0])).toContain(`Message:\n${DOC.text}`);
      expect(report).toMatchObject({ claims: 0, fallbackChunks: 1, fallbackCalls: 1 });
    }),
  );

  it.effect(
    'raising the predicate threshold moves the confident claim to the LLM too',
    Effect.fnUntraced(function* () {
      const prompts: unknown[] = [];
      const { report } = yield* extractSystemOneDocFacts(DOC, {
        ...OPTIONS,
        systemOne: { thresholds: { minPredicateConfidence: 0.9 } },
      }).pipe(Effect.provide(systemOneAiService({ extract: clairic, decide: clef, fallback: [FALLBACK], prompts })));
      expect(report).toMatchObject({ accepted: 0, fallbackClaims: 2, fallbackCalls: 1 });
      expect(String(prompts[0])).toContain(`Message:\n${CLAIMS.join('\n')}`);
    }),
  );

  it.effect(
    'without the fallback, uncertain claims are dropped',
    Effect.fnUntraced(function* () {
      const { facts, report } = yield* extractSystemOneDocFacts(DOC, {
        ...OPTIONS,
        systemOne: { fallback: false },
      }).pipe(Effect.provide(systemOneAiService({ extract: clairic, decide: clef })));
      expect(facts).toHaveLength(1);
      expect(report).toMatchObject({ dropped: 1, fallbackCalls: 0 });
    }),
  );
});
