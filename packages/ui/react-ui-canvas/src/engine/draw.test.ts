//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { type View } from '../model/index.ts';
import { createViewTree } from '../testing/index.ts';
import { deleteElements, moveNodes } from '../utils/index.ts';
import { createDrawState, updateView } from './draw-state.ts';
import { createDrawScene } from './draw.ts';

describe('draw scene', () => {
  test('the scene atom re-emits after apply and after an external store write', ({ expect }) => {
    const registry = Registry.make();
    const { views, root } = createViewTree(1, 'r');
    const store = createDrawState(views);
    const draw = createDrawScene({ registry, store, sceneId: root });
    // Read the starting centre off the fixture, not the atom: a read of its own would count as an emission.
    const before = views.find((view) => view.id === root)?.nodes['scene:r/a']?.center;
    if (!before) {
      throw new Error('fixture has no node scene:r/a');
    }
    const seen: View[] = [];
    const unsubscribe = registry.subscribe(draw.scene, (scene) => seen.push(scene));

    draw.apply(moveNodes(['scene:r/a'], { x: 5, y: 5 }));
    expect(registry.get(draw.scene).nodes['scene:r/a']?.center).toEqual({ x: before.x + 5, y: before.y + 5 });

    updateView(registry, store, root, deleteElements(['scene:r/t']));
    expect(registry.get(draw.scene).nodes['scene:r/t']).toBeUndefined();
    expect(seen.length).toBe(2);
    unsubscribe();
  });
});
