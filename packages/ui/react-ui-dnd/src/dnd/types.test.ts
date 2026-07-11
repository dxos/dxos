//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { getSourceData, type DndTileData } from './types';

describe('getSourceData', () => {
  test('returns tile payload when type is tile', () => {
    const tile: DndTileData = { type: 'tile', containerId: 'c1', id: 'a', data: {}, location: 0 };
    expect(getSourceData({ data: tile } as any)).toEqual(tile);
  });

  test('returns null for non-tile payloads', () => {
    expect(getSourceData({ data: { type: 'container', id: 'c1' } } as any)).toBeNull();
  });
});
