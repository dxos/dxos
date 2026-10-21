//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { withLegacyParams } from './types.ts';

describe('withLegacyParams', () => {
  const frame = { z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };

  test("moves a type's settings stored beside the shared fields into its params", ({ expect }) => {
    // Stored before `params`: these fields are no longer in the schema.
    const polygon = { id: 'p', type: 'polygon', ...frame, sides: 5, fit: 'circle' };
    const cloud = { id: 'c', type: 'cloud', ...frame, bumps: 7 };
    expect(withLegacyParams(polygon)).toEqual({
      id: 'p',
      type: 'polygon',
      ...frame,
      params: { sides: 5, fit: 'circle' },
    });
    expect(withLegacyParams(cloud)).toEqual({
      id: 'c',
      type: 'cloud',
      ...frame,
      params: { bumps: 7 },
    });
  });

  test('a value already in params wins, and a node in the current shape is returned as it is', ({ expect }) => {
    const both = { id: 'p', type: 'polygon', ...frame, sides: 5, params: { sides: 8 } };
    expect(withLegacyParams(both)).toMatchObject({ params: { sides: 8 } });
    const current = { id: 'p', type: 'polygon', ...frame, params: { sides: 5 } };
    expect(withLegacyParams(current)).toBe(current);
    // Another type's field of the same name is its own.
    const instance = { id: 'i', type: 'instance', ...frame, fit: 'fill' };
    expect(withLegacyParams(instance)).toBe(instance);
  });
});
