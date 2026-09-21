//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { reduceIntent } from '../model/projection.ts';
import { type Scene } from '../model/types.ts';
import { copySelection, pasteFragment } from './clipboard.ts';
import { createSceneTree } from './testing.ts';

const fixture = (): Scene => {
  const { scenes, root } = createSceneTree(1, 'r');
  const scene = scenes.find((scene) => scene.id === root);
  if (!scene) {
    throw new Error('fixture has no root scene');
  }
  return scene;
};

describe('clipboard', () => {
  test('copy takes the selected nodes and only the links between them', ({ expect }) => {
    const scene = fixture();
    const clipboard = copySelection(scene, ['scene:r/a', 'scene:r/b', 'scene:r/ab', 'scene:r/ac']);
    expect(clipboard?.nodes.map(({ id }) => id)).toEqual(['scene:r/a', 'scene:r/b']);
    // a→b joins two copied nodes; a→c does not, selected or not.
    expect(clipboard?.links.map(({ id }) => id)).toEqual(['scene:r/ab']);
    expect(copySelection(scene, ['scene:r/ab'])).toBeUndefined();
  });

  test('paste recreates the fragment with fresh ids, offset, and rewired links, as one batch', ({ expect }) => {
    const scene = fixture();
    const clipboard = copySelection(scene, ['scene:r/b', 'scene:r/c']);
    if (!clipboard) {
      throw new Error('nothing copied');
    }
    let counter = 0;
    const { intent, ids } = pasteFragment({
      clipboard,
      offset: { x: 64, y: 64 },
      createId: (prefix) => `${prefix}-${++counter}`,
      nodeZ: (index) => `n${index}`,
      linkZ: (index) => `l${index}`,
    });
    expect(ids).toEqual(['ellipse-1', 'class-2', 'spline-3']);
    const next = reduceIntent(scene, intent);
    expect(Object.keys(next.nodes).length).toBe(6);
    expect(next.nodes['ellipse-1'].center).toEqual({ x: 768, y: 256 });
    const spline = next.links['spline-3'];
    expect(spline.type === 'spline' && spline.points).toEqual([{ x: 704, y: 576 }]);
    expect(spline.source.node).toBe('ellipse-1');
    expect(spline.target.node).toBe('class-2');
    // The originals are untouched.
    expect(next.nodes['scene:r/b'].center).toEqual(scene.nodes['scene:r/b'].center);
  });
});
