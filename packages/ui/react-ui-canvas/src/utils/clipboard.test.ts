//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { reduceIntent } from '../model/projection.ts';
import { type Link, type Scene, endpointNode } from '../model/types.ts';
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
    // Offsets are read against the fixture, whose coordinates are a layout and change with it.
    const origin = scene.nodes['scene:r/b'].center;
    expect(next.nodes['ellipse-1'].center).toEqual({ x: origin.x + 64, y: origin.y + 64 });
    const source = scene.links['scene:r/bc'];
    const controls = source.type === 'spline' ? source.points : [];
    const spline = next.links['spline-3'];
    expect(spline.type === 'spline' && spline.points).toEqual(controls.map(({ x, y }) => ({ x: x + 64, y: y + 64 })));
    expect(endpointNode(spline.source)).toBe('ellipse-1');
    expect(endpointNode(spline.target)).toBe('class-2');
    // The originals are untouched.
    expect(next.nodes['scene:r/b'].center).toEqual(scene.nodes['scene:r/b'].center);
  });

  test('a free end is copied with its node and moves with the paste', ({ expect }) => {
    const scene = fixture();
    const free: Link = {
      type: 'line',
      id: 'f',
      z: 'z',
      source: { node: 'scene:r/a' },
      target: { point: { x: 0, y: 0 } },
    };
    const withFree = { ...scene, links: { ...scene.links, f: free } };
    const clipboard = copySelection(withFree, ['scene:r/a']);
    expect(clipboard?.links.map(({ id }) => id)).toEqual(['f']);
    // A link with two free ends is nobody's: it comes along only when selected itself.
    const loose: Link = { ...free, id: 'loose', source: { point: { x: 1, y: 1 } } };
    const withLoose = { ...withFree, links: { ...withFree.links, loose } };
    expect(copySelection(withLoose, ['scene:r/b'])?.links).toEqual([]);
    expect(copySelection(withLoose, ['scene:r/b', 'loose'])?.links.map(({ id }) => id)).toEqual(['loose']);
    if (!clipboard) {
      throw new Error('nothing copied');
    }
    const { intent } = pasteFragment({
      clipboard,
      offset: { x: 64, y: 32 },
      createId: (prefix) => `${prefix}-x`,
      nodeZ: () => 'n',
      linkZ: () => 'l',
    });
    expect(reduceIntent(withFree, intent).links['line-x']?.target).toEqual({ point: { x: 64, y: 32 } });
  });
});
