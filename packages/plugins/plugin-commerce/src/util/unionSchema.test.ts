//
// Copyright 2026 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';
import { describe, test } from 'vitest';

import { buildUnionFormSchema, mergeJsonSchemas } from './unionSchema';

const propertyNames = (ast: SchemaAST.AST): string[] => {
  let current: SchemaAST.AST = ast;
  // Unwrap transformations/refinements to reach the underlying type literal.
  while (current._tag === 'Transformation') {
    current = current.from;
  }
  return current._tag === 'TypeLiteral' ? current.propertySignatures.map((sig) => String(sig.name)) : [];
};

describe('mergeJsonSchemas', () => {
  test('unions properties across providers, keyed by name', ({ expect }) => {
    const a = { type: 'object', properties: { make: { type: 'string' } } };
    const b = { type: 'object', properties: { make: { type: 'string' }, price: { type: 'number' } } };
    const merged = mergeJsonSchemas([a, b]);
    expect(Object.keys(merged.properties ?? {}).sort()).toEqual(['make', 'price']);
  });

  test('returns an empty object schema for no providers', ({ expect }) => {
    const merged = mergeJsonSchemas([]);
    expect(merged.type).toEqual('object');
    expect(merged.properties).toEqual({});
  });
});

describe('buildUnionFormSchema', () => {
  test('produces an Effect schema exposing each JSON Schema property as a field', ({ expect }) => {
    // The exact shape the provider skill authors (string + number fields with titles).
    const searchSchema = {
      type: 'object',
      properties: {
        make: { type: 'string', title: 'Make' },
        model: { type: 'string', title: 'Model' },
        priceTo: { type: 'number', title: 'Max Price' },
        yearFrom: { type: 'number', title: 'Min Year' },
        page: { type: 'number', title: 'Page' },
      },
    };

    const schema = buildUnionFormSchema([searchSchema]);
    expect(propertyNames(schema.ast).sort()).toEqual(['make', 'model', 'page', 'priceTo', 'yearFrom']);
  });
});
