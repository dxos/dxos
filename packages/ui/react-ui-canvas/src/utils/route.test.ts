//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultNodeRegistry } from '../model/registry.ts';
import { type Link } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { insertIndex, linkGeometry, linkPath, sideToward, splinePath } from './route.ts';

const from = { point: { x: 0, y: 0 }, side: 'e' as const };
const to = { point: { x: 300, y: 0 }, side: 'w' as const };
const ends = { source: { node: 'a' }, target: { node: 'b' }, z: 'z' };

describe('route', () => {
  test('each link type routes by its own rule', ({ expect }) => {
    const line: Link = { type: 'line', id: 'l', ...ends };
    const curve: Link = { type: 'curve', id: 'c', ...ends };
    const spline: Link = { type: 'spline', id: 's', ...ends, points: [{ x: 150, y: 100 }] };
    expect(linkPath(line, from, to)).toBe('M 0 0 L 300 0');
    expect(linkPath(curve, from, to)).toMatch(/^M 0 0 C .* 300 0$/);
    expect(linkPath(spline, from, to)).toMatch(/^M 0 0 C .* 150 100 C .* 300 0$/);
  });

  test('a spline through two points is a line and passes through every control point', ({ expect }) => {
    expect(
      splinePath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe('M 0 0 L 10 10');
    const path = splinePath([
      { x: 0, y: 0 },
      { x: 5, y: 9 },
      { x: 10, y: 0 },
    ]);
    expect(path).toContain(', 5 9');
    expect(path).toContain(', 10 0');
  });

  test('insertIndex picks the nearest segment of the polyline', ({ expect }) => {
    const points = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ];
    expect(insertIndex(from.point, points, to.point, { x: 50, y: 40 })).toBe(0);
    expect(insertIndex(from.point, points, to.point, { x: 150, y: 110 })).toBe(1);
    expect(insertIndex(from.point, points, to.point, { x: 260, y: 40 })).toBe(2);
  });

  test('a free end faces the other end, and a node end facing it takes its nearest port', ({ expect }) => {
    const scene = SceneBuilder.create('s')
      .rect('a', { x: 0, y: 0, width: 256, height: 128 })
      .line('free', '@-200,64', '@-100,64')
      .line('half', '@640,64', 'a')
      .build();
    expect(sideToward({ x: 0, y: 0 }, { x: 10, y: 3 })).toBe('e');
    expect(sideToward({ x: 0, y: 0 }, { x: -3, y: 10 })).toBe('s');
    const free = linkGeometry(scene, defaultNodeRegistry, scene.links.free);
    expect(free?.path).toBe('M -200 64 L -100 64');
    expect([free?.source.side, free?.target.side]).toEqual(['e', 'w']);
    // The rectangle's east centre is the port nearest a point off to its right.
    const half = linkGeometry(scene, defaultNodeRegistry, scene.links.half);
    expect(half?.target).toEqual({ point: { x: 256, y: 64 }, side: 'e' });
    expect(half?.source.side).toBe('w');
  });

  test('a spline leaves and enters its ports along the side normals', ({ expect }) => {
    const path = splinePath(
      [
        { x: 0, y: 0 },
        { x: 150, y: 100 },
        { x: 300, y: 0 },
      ],
      'e',
      'w',
    );
    // First control point is due east of the start, last control point due west of the end.
    expect(path).toMatch(/^M 0 0 C (\d+(\.\d+)?) 0, /);
    expect(path).toMatch(/, (\d+(\.\d+)?) 0, 300 0$/);
    const [, firstX] = path.match(/^M 0 0 C (\d+(\.\d+)?) 0, /) ?? [];
    const [, lastX] = path.match(/, (\d+(\.\d+)?) 0, 300 0$/) ?? [];
    expect(Number(firstX)).toBeGreaterThan(0);
    expect(Number(lastX)).toBeLessThan(300);
  });
});
