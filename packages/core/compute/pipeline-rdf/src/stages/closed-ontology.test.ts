//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { queuedAiService } from '../testing/index.ts';
import { Vocab, Vocabularies } from '../types/index.ts';
import { extractDocFacts } from './extract-facts.ts';

const fact = (subject: string, predicate: string, object: string) => ({
  subject,
  predicate,
  object,
  factuality: 'CT+',
  polarity: '+',
});

const DOC = { text: 'Bob replied to Alice and juggles flaming torches.', source: 'discord:1', author: 'bob' };

const PAYLOAD = { facts: [fact('Bob', 'replies to', 'Alice'), fact('Bob', 'juggles', 'flaming torches')] };

describe('closed ontology', () => {
  it.effect(
    'keeps listed predicates under their vocabulary IRI and drops the ones the model mints',
    Effect.fnUntraced(function* () {
      const prompts: unknown[] = [];
      const ontology = Vocabularies.compose([Vocabularies.SIOC]);
      const facts = yield* extractDocFacts(DOC, { ontology, closed: true }).pipe(
        Effect.provide(queuedAiService([PAYLOAD], prompts)),
      );
      expect(facts.map(({ assertion }) => assertion.predicateIri)).toEqual([`${Vocab.SIOC}reply_of`]);
      expect(String(prompts[0])).toContain('never write a predicate that is not listed');
    }),
  );

  it.effect(
    'an open ontology mints the unlisted predicate instead',
    Effect.fnUntraced(function* () {
      const ontology = Vocabularies.compose([Vocabularies.SIOC]);
      const facts = yield* extractDocFacts(DOC, { ontology }).pipe(Effect.provide(queuedAiService([PAYLOAD])));
      expect(facts).toHaveLength(2);
      expect(facts[1].assertion.predicateIri?.startsWith(ontology.namespace)).toBe(true);
    }),
  );
});
