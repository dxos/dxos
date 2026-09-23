//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { reduceIntent } from '../model/projection.ts';
import { MAJOR_GRID, type Node, type Scene } from '../model/types.ts';
import { layoutScene } from './layout.ts';

const node = (id: string, center = { x: 0, y: 0 }, size = { width: 128, height: 64 }): Node => ({
  id,
  type: 'rect',
  z: id,
  center,
  size,
});

/** a → b → c with a second branch a → d, all piled on the origin. */
const fixture = (): Scene => ({
  id: 'scene',
  nodes: Object.fromEntries([node('a'), node('b'), node('c'), node('d')].map((node) => [node.id, node])),
  links: Object.fromEntries(
    [
      { id: 'ab', source: 'a', target: 'b' },
      { id: 'bc', source: 'b', target: 'c' },
      { id: 'ad', source: 'a', target: 'd' },
    ].map(({ id, source, target }) => [
      id,
      { type: 'line' as const, id, z: id, source: { node: source }, target: { node: target } },
    ]),
  ),
});

const rowOf = (scene: Scene, id: string) => scene.nodes[id].center.y;

describe('layout', () => {
  test('a chain ranks into rows, branches share one', ({ expect }) => {
    const scene = layoutScene(fixture());
    expect(rowOf(scene, 'a')).toBeLessThan(rowOf(scene, 'b'));
    expect(rowOf(scene, 'b')).toBeLessThan(rowOf(scene, 'c'));
    // `d` is one past `a`, the same rank as `b`.
    expect(rowOf(scene, 'd')).toBe(rowOf(scene, 'b'));
    expect(scene.nodes.b.center.x).not.toBe(scene.nodes.d.center.x);
  });

  test('every centre lands on the major grid and no node changes size', ({ expect }) => {
    const before = fixture();
    const scene = layoutScene(before);
    for (const node of Object.values(scene.nodes)) {
      expect(node.center.x % MAJOR_GRID).toBe(0);
      expect(node.center.y % MAJOR_GRID).toBe(0);
      expect(node.size).toEqual(before.nodes[node.id].size);
      expect(node.type).toBe(before.nodes[node.id].type);
    }
  });

  test('a row is as tall as its tallest node, so mixed sizes do not overlap', ({ expect }) => {
    const base = fixture();
    const tall = { ...base, nodes: { ...base.nodes, b: node('b', { x: 0, y: 0 }, { width: 128, height: 320 }) } };
    const scene = layoutScene(tall);
    const gap = rowOf(scene, 'c') - rowOf(scene, 'b');
    expect(gap).toBeGreaterThanOrEqual(320 / 2 + scene.nodes.c.size.height / 2);
  });

  test('a locked node stays where it is', ({ expect }) => {
    const base = fixture();
    const locked = { ...base, nodes: { ...base.nodes, c: { ...base.nodes.c, locked: true } } };
    const scene = layoutScene(locked);
    expect(scene.nodes.c.center).toEqual(base.nodes.c.center);
    expect(scene.nodes.a.center).not.toEqual(base.nodes.a.center);
  });

  test('ids narrow what moves', ({ expect }) => {
    const base = fixture();
    const scene = layoutScene(base, ['a', 'b']);
    expect(scene.nodes.c.center).toEqual(base.nodes.c.center);
    expect(scene.nodes.d.center).toEqual(base.nodes.d.center);
    expect(rowOf(scene, 'a')).toBeLessThan(rowOf(scene, 'b'));
  });

  test('laying out an already laid-out scene changes nothing', ({ expect }) => {
    const once = layoutScene(fixture());
    expect(layoutScene(once)).toBe(once);
  });

  test('the layout intent reaches the reducer', ({ expect }) => {
    const base = fixture();
    const scene = reduceIntent(base, { kind: 'layout' });
    expect(scene).not.toBe(base);
    expect(rowOf(scene, 'a')).toBeLessThan(rowOf(scene, 'c'));
    // Links are untouched: only centres move.
    expect(scene.links).toBe(base.links);
  });

  test('an empty scene is returned as it was', ({ expect }) => {
    const empty: Scene = { id: 'scene', nodes: {}, links: {} };
    expect(layoutScene(empty)).toBe(empty);
  });
});
