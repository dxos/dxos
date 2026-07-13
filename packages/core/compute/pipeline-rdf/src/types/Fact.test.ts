//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Fact } from './Fact';

const ALICE_FACT: Fact = {
  id: 'fact-1',
  assertion: {
    subject: { entity: 'alice' },
    predicate: 'travelsTo',
    object: { entity: 'paris' },
    validFrom: '2026-06-12',
    quote: "I think I'm probably going to Paris next week",
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
  attribution: {
    agent: 'alice',
    source: 'dxn:queue:...:msg-1',
    generatedAtTime: '2026-06-06T00:00:00.000Z',
  },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'ai.claude.model.claude-haiku-4-5', version: '1' },
  sourceHash: 'abc123',
};

describe('Fact schema', () => {
  test('encodes and decodes via JSON', ({ expect }) => {
    const encoded = Schema.encodeSync(Fact)(ALICE_FACT);
    const json = JSON.stringify(encoded);
    const decoded = Schema.decodeUnknownSync(Fact)(JSON.parse(json));
    expect(decoded).toEqual(ALICE_FACT);
  });

  test('rejects an invalid factuality value', ({ expect }) => {
    expect(() =>
      Schema.decodeUnknownSync(Fact)({ ...ALICE_FACT, factuality: { ...ALICE_FACT.factuality, value: 'NOPE' } }),
    ).toThrow();
  });

  test('a fact without illocution is valid (defaults to assertive)', ({ expect }) => {
    const decoded = Schema.decodeUnknownSync(Fact)(Schema.encodeSync(Fact)(ALICE_FACT));
    expect(decoded.illocution).toBeUndefined();
  });

  test('round-trips a directive/interrogative illocution (a question)', ({ expect }) => {
    const question: Fact = {
      ...ALICE_FACT,
      id: 'fact-q',
      assertion: { subject: { entity: 'meeting' }, predicate: 'startsAt', object: { literal: '?' } },
      factuality: { value: 'Uu', polarity: '?' },
      illocution: { force: 'directive', mood: 'interrogative', addressee: 'bob' },
    };
    const decoded = Schema.decodeUnknownSync(Fact)(JSON.parse(JSON.stringify(Schema.encodeSync(Fact)(question))));
    expect(decoded).toEqual(question);
  });

  test('rejects an invalid illocutionary force', ({ expect }) => {
    expect(() => Schema.decodeUnknownSync(Fact)({ ...ALICE_FACT, illocution: { force: 'promising' } })).toThrow();
  });
});
