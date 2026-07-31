//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { resolveDrop } from './Root';
import { type DndContainerHandler, type DndTileData } from './types';

const source: DndTileData = { type: 'tile', containerId: 'c1', id: 'a', data: { id: 'a' }, location: 0 };
const target: DndTileData = { type: 'tile', containerId: 'c1', id: 'b', data: { id: 'b' }, location: 1 };

describe('resolveDrop', () => {
  test('same handler → onDrop (reorder), onTake not called', () => {
    const onDrop = vi.fn();
    const onTake = vi.fn();
    const handler: DndContainerHandler = { id: 'c1', onDrop, onTake };
    resolveDrop(handler, handler, source, target);
    expect(onDrop).toHaveBeenCalledWith({ source, target });
    expect(onTake).not.toHaveBeenCalled();
  });

  test('different handlers → source.onTake then target.onDrop with transferred object', async () => {
    const transferred = { id: 'a', moved: true };
    const sourceHandler: DndContainerHandler = {
      id: 'c1',
      onTake: vi.fn(({ source: _s }, cb) => cb(transferred)),
    };
    const targetOnDrop = vi.fn();
    const targetHandler: DndContainerHandler = { id: 'c2', onDrop: targetOnDrop };
    resolveDrop(sourceHandler, targetHandler, source, target);
    await Promise.resolve();
    expect(sourceHandler.onTake).toHaveBeenCalled();
    expect(targetOnDrop).toHaveBeenCalledWith({ source: { ...source, data: transferred }, target });
  });

  test('different handlers but source lacks onTake → no throw, target.onDrop not called', () => {
    const targetOnDrop = vi.fn();
    resolveDrop({ id: 'c1' }, { id: 'c2', onDrop: targetOnDrop }, source, target);
    expect(targetOnDrop).not.toHaveBeenCalled();
  });
});
