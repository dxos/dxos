//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseExtractPayload } from './extract';

describe('parseExtractPayload', () => {
  test('salvages the JSON object from reasoning-wrapped model output', ({ expect }) => {
    const raw = [
      'We need to extract facts. Let me think about the propositions here.',
      '{"facts": [{"subject": "Alice", "predicate": "works at", "object": "Acme", "factuality": "CT+", "polarity": "+"}]}',
      'That is my final answer.',
    ].join('\n');

    const { facts } = parseExtractPayload(raw);
    expect(facts).toHaveLength(1);
    expect(facts[0].subject).toBe('Alice');
    expect(facts[0].object).toBe('Acme');
    expect(facts[0].factuality).toBe('CT+');
  });

  test('keeps schema-conforming facts and drops malformed ones', ({ expect }) => {
    const raw = JSON.stringify({
      facts: [
        { subject: 'Bob', predicate: 'owes', object: 'report', factuality: 'PR+', polarity: '+' },
        { subject: 'X', predicate: 'is', object: 'Y', factuality: 'NONSENSE', polarity: '+' }, // bad factuality
        { predicate: 'missing subject', object: 'Z', factuality: 'CT+', polarity: '+' }, // missing subject
      ],
    });
    const { facts } = parseExtractPayload(raw);
    expect(facts).toHaveLength(1);
    expect(facts[0].subject).toBe('Bob');
  });

  test('skips stray braces / non-facts objects before the real payload', ({ expect }) => {
    const raw = [
      'Let me reason about a {placeholder} and consider {"note": "not the payload"}.',
      '{"facts": [{"subject": "Carol", "predicate": "leads", "object": "Sales", "factuality": "CT+", "polarity": "+"}]}',
      'Done thinking.',
    ].join('\n');
    const { facts } = parseExtractPayload(raw);
    expect(facts).toHaveLength(1);
    expect(facts[0].subject).toBe('Carol');
  });

  test('returns no facts for output with no JSON object', ({ expect }) => {
    expect(parseExtractPayload('I could not find anything to extract.').facts).toHaveLength(0);
  });

  test('returns no facts for malformed JSON', ({ expect }) => {
    expect(parseExtractPayload('{"facts": [ {broken').facts).toHaveLength(0);
  });
});
