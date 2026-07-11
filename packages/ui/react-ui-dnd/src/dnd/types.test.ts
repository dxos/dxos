//
// Copyright 2026 DXOS.org
//

import { type ElementDragPayload } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { describe, expect, test } from 'vitest';

import { type DndTileData, getSourceData } from './types';

// getSourceData only reads `source.data`; a minimal typed payload avoids casting the whole shape.
const payload = (data: Record<string, unknown>): ElementDragPayload =>
  ({ element: document.createElement('div'), dragHandle: null, data }) satisfies ElementDragPayload;

describe('getSourceData', () => {
  test('returns tile payload when type is tile', () => {
    const tile: DndTileData = { type: 'tile', containerId: 'c1', id: 'a', data: {}, location: 0 };
    expect(getSourceData(payload(tile))).toEqual(tile);
  });

  test('returns null for non-tile payloads', () => {
    expect(getSourceData(payload({ type: 'container', id: 'c1' }))).toBeNull();
  });
});
