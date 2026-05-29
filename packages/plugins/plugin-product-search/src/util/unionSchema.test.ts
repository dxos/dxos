//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { mergeJsonSchemas } from './unionSchema';

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
