//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SceneBuilder } from './builder.ts';

describe('SceneBuilder', () => {
  test('writes typed nodes and links from top-left boxes and port refs, in paint order', ({ expect }) => {
    const scene = SceneBuilder.create('s', 'Sample')
      .rect('a', { x: 0, y: 0, width: 200, height: 100 }, 'A')
      .ellipse('b', { x: 400, y: 0, width: 200, height: 100 }, 'B')
      .class('c', { x: 0, y: 300, width: 200, height: 150 }, 'C', ['id: string'])
      .line('ab', 'a#e2', 'b#w2')
      .spline('bc', 'b', 'c', [{ x: 300, y: 250 }])
      .build();

    expect(scene.name).toBe('Sample');
    expect(Object.keys(scene.nodes)).toEqual(['a', 'b', 'c']);
    expect(scene.nodes.a.center).toEqual({ x: 100, y: 50 });
    expect(scene.nodes.b.type === 'ellipse' && [scene.nodes.b.rx, scene.nodes.b.ry]).toEqual([100, 50]);
    expect(scene.nodes.c.type === 'class' && scene.nodes.c.attributes).toEqual(['id: string']);
    expect(scene.links.ab.source).toEqual({ node: 'a', port: 'e2' });
    expect(scene.links.ab.target).toEqual({ node: 'b', port: 'w2' });
    expect(scene.links.bc.source).toEqual({ node: 'b' });
    expect(scene.links.bc.type === 'spline' && scene.links.bc.points).toEqual([{ x: 300, y: 250 }]);
    const zs = [scene.nodes.a.z, scene.nodes.b.z, scene.nodes.c.z, scene.links.ab.z, scene.links.bc.z];
    expect([...zs].sort()).toEqual(zs);
  });
});
