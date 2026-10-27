//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { ExtractPayload, parseExtractPayload } from './extract.ts';

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

/** Paths of JSON-schema nodes that declare no type, which Anthropic's structured output rejects. */
const untypedPaths = (node: unknown, path: string): string[] => {
  if (typeof node !== 'object' || node === null) {
    return [];
  }
  const typed = ['type', 'anyOf', '$ref', 'enum', 'const'].some((key) => key in node);
  const properties = Reflect.get(node, 'properties');
  const items = Reflect.get(node, 'items');
  const anyOf = Reflect.get(node, 'anyOf');
  return [
    ...(typed ? [] : [path]),
    ...(typeof properties === 'object' && properties !== null
      ? Object.entries(properties).flatMap(([name, property]) => untypedPaths(property, `${path}.${name}`))
      : []),
    ...(items !== undefined ? untypedPaths(items, `${path}[]`) : []),
    ...(Array.isArray(anyOf) ? anyOf.flatMap((branch) => untypedPaths(branch, path)) : []),
  ];
};

describe('ExtractPayload', () => {
  test('types every property, as structured output requires', ({ expect }) => {
    expect(untypedPaths(Schema.toJsonSchemaDocument(ExtractPayload).schema, '$')).toEqual([]);
  });
});
