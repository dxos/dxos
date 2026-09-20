//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { isClassNode, isEllipseNode } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';

describe('SceneBuilder', () => {
  test('writes typed nodes and links from top-left boxes and port refs, in paint order', ({ expect }) => {
    const scene = SceneBuilder.create('s', 'Sample')
      .rect('a', { x: 0, y: 0, width: 200, height: 100 }, 'A')
      .ellipse('b', { x: 400, y: 0, width: 200, height: 100 }, 'B')
      .class('c', { x: 0, y: 300, width: 200, height: 150 }, 'C', ['id: string'])
      .line('ab', 'a#e2', 'b#w2')
      .spline('bc', 'b', 'c', [{ x: 300, y: 250 }])
      .line('free', '@10,20', 'a', { ends: { start: 'circle', end: 'arrow' } })
      .build();

    expect(scene.name).toBe('Sample');
    expect(Object.keys(scene.nodes)).toEqual(['a', 'b', 'c']);
    expect(scene.nodes.a.center).toEqual({ x: 100, y: 50 });
    expect(isEllipseNode(scene.nodes.b) && scene.nodes.b.size).toEqual({ width: 200, height: 100 });
    expect(isClassNode(scene.nodes.c) && scene.nodes.c.attributes).toEqual(['id: string']);
    expect(scene.links.ab.source).toEqual({ node: 'a', port: 'e2' });
    expect(scene.links.ab.target).toEqual({ node: 'b', port: 'w2' });
    expect(scene.links.bc.source).toEqual({ node: 'b' });
    expect(scene.links.bc.type === 'spline' && scene.links.bc.points).toEqual([{ x: 300, y: 250 }]);
    expect(scene.links.free.source).toEqual({ point: { x: 10, y: 20 } });
    expect(scene.links.free.ends).toEqual({ start: 'circle', end: 'arrow' });
    const zs = [scene.nodes.a.z, scene.nodes.b.z, scene.nodes.c.z, scene.links.ab.z, scene.links.bc.z];
    expect([...zs].sort()).toEqual(zs);
  });
});
