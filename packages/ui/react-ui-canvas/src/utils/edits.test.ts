//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Point, isRectNode } from '@dxos/scene';

import { type View } from '../model/index.ts';
import { createViewTree } from '../testing/index.ts';
import { chainEdits, deleteElements, insertLink, insertNode, moveNodes, resizeTo, updateElement } from './edits.ts';

const fixture = (): View => {
  const { views, root } = createViewTree(1, 'r');
  const scene = views.find((scene) => scene.id === root);
  if (!scene) {
    throw new Error('fixture has no root scene');
  }
  return scene;
};

const centerOf = (scene: View, id: string) => scene.nodes[id]?.center;

/** The centre of a node the fixture is known to hold; the throw names the id rather than asserting it away. */
const originOf = (scene: View, id: string): Point => {
  const center = centerOf(scene, id);
  if (!center) {
    throw new Error(`fixture has no node ${id}`);
  }
  return center;
};

describe('scene edits', () => {
  test('create refuses a view node inside an Object definition, and allows it in a View', ({ expect }) => {
    const scene = fixture();
    const node = {
      id: 'v',
      type: 'view',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 64, height: 64 },
      scene: 'x',
    };
    const object: View = { ...scene, kind: 'composite' };
    expect(insertNode(node)(object)).toBe(object);
    expect(chainEdits([insertNode(node)])(object)).toBe(object);
    expect(insertNode(node)(scene).nodes.v).toEqual(node);
  });

  test('move shifts the selected nodes and skips locked ones', ({ expect }) => {
    const scene = fixture();
    const locked = { ...scene, nodes: { ...scene.nodes, 'scene:r/b': { ...scene.nodes['scene:r/b'], locked: true } } };
    const delta = { x: 10, y: -5 };
    const next = moveNodes(['scene:r/a', 'scene:r/b'], delta)(locked);
    // Read against the fixture rather than its coordinates, which are a layout and change with it.
    const before = originOf(scene, 'scene:r/a');
    expect(centerOf(next, 'scene:r/a')).toEqual({ x: before.x + delta.x, y: before.y + delta.y });
    expect(centerOf(next, 'scene:r/b')).toEqual(centerOf(scene, 'scene:r/b'));
    expect(moveNodes(['missing'], { x: 1, y: 1 })(scene)).toBe(scene);
  });

  test('resize writes the size of a box and the radii of an ellipse', ({ expect }) => {
    const bounds = { x: 0, y: 0, width: 100, height: 50 };
    const rect = resizeTo('scene:r/a', bounds)(fixture()).nodes['scene:r/a'];
    expect(rect.type === 'rect' && rect.size).toEqual({ width: 100, height: 50 });
    expect(rect.center).toEqual({ x: 50, y: 25 });
    const ellipse = resizeTo('scene:r/b', bounds)(fixture()).nodes['scene:r/b'];
    expect(ellipse.type === 'ellipse' && ellipse.size).toEqual({ width: 100, height: 50 });
    expect(ellipse.center).toEqual({ x: 50, y: 25 });
  });

  test('link adds a typed link and rejects self-links and unknown ends', ({ expect }) => {
    const scene = fixture();
    const link = (id: string, source: string, target: string) =>
      ({
        type: 'spline',
        id,
        z: 'z',
        source: { node: source, port: 'e' },
        target: { node: target },
        points: [],
      }) as const;
    const next = insertLink(link('l', 'scene:r/b', 'scene:r/c'))(scene);
    expect(next.links.l?.type).toBe('spline');
    expect(next.links.l?.source).toEqual({ node: 'scene:r/b', port: 'e' });
    expect(insertLink(link('x', 'scene:r/a', 'scene:r/a'))(scene)).toBe(scene);
    expect(insertLink(link('x', 'scene:r/a', 'nope'))(scene)).toBe(scene);
  });

  test('a free end needs no node and outlives the deletion of the other end', ({ expect }) => {
    const free = {
      type: 'line',
      id: 'f',
      z: 'z',
      source: { node: 'scene:r/a' },
      target: { point: { x: 10, y: 10 } },
    } as const;
    const next = insertLink(free)(fixture());
    expect(next.links.f?.target).toEqual({ point: { x: 10, y: 10 } });
    expect(deleteElements(['scene:r/b'])(next).links.f).toBeDefined();
    expect(deleteElements(['scene:r/a'])(next).links.f).toBeUndefined();
  });

  test('update merges properties of nodes and links but never the id or type', ({ expect }) => {
    const next = updateElement('scene:r/a', { id: 'other', label: 'Renamed', center: { x: 1, y: 2 } })(fixture());
    const node = next.nodes['scene:r/a'];
    expect(node.type).toBe('rect');
    expect(isRectNode(node) && node.label).toBe('Renamed');
    expect(node.center).toEqual({ x: 1, y: 2 });
    expect(next.nodes.other).toBeUndefined();

    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    const spline = updateElement('scene:r/bc', { points })(fixture()).links['scene:r/bc'];
    expect(spline.type === 'spline' && spline.points).toEqual(points);
  });

  test('delete removes nodes, links and the links attached to deleted nodes', ({ expect }) => {
    const next = deleteElements(['scene:r/a', 'scene:r/bc'])(fixture());
    expect(Object.keys(next.nodes).sort()).toEqual(['scene:r/b', 'scene:r/c', 'scene:r/t']);
    expect(Object.keys(next.links)).toEqual([]);
  });
});
