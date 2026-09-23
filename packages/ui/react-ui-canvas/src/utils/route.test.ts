//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultNodeRegistry } from '../model/registry.ts';
import { type Link } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { insertIndex, linkGeometry, linkPath, sideToward, smartPoints, splinePath } from './route.ts';

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
    expect(linkPath(spline, from, to)).toMatch(/^M 0 0 L .* Q 150 100, .* L 300 0$/);
    const smart: Link = { type: 'smart', id: 'm', ...ends };
    expect(linkPath(smart, from, to)).toMatch(/^M 0 0 L .* L 300 0$/);
  });

  test('a smart link stubs out of each port along its normal by half a major cell', ({ expect }) => {
    // Facing ports, so the stubs point at each other and the middle segment joins them.
    expect(smartPoints(from, to)).toEqual([
      { x: 0, y: 0 },
      { x: 32, y: 0 },
      { x: 268, y: 0 },
      { x: 300, y: 0 },
    ]);
    // Two ports on the same side leave the same way, so the route doubles back through the middle
    // segment rather than cutting across either node — the elbow the ports imply.
    expect(smartPoints({ point: { x: 0, y: 0 }, side: 'e' }, { point: { x: 0, y: 200 }, side: 'e' })).toEqual([
      { x: 0, y: 0 },
      { x: 32, y: 0 },
      { x: 32, y: 200 },
      { x: 0, y: 200 },
    ]);
  });

  test('a spline is a rounded polyline that bends around its control points', ({ expect }) => {
    // Nothing between the ends is a plain line.
    expect(
      splinePath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe('M 0 0 L 10 10');
    // A right angle is cut 32 back along each segment; the corner is the quadratic's control, so the
    // route bends around it and never reaches it.
    expect(
      splinePath([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ]),
    ).toBe('M 0 0 L 68 0 Q 100 0, 100 32 L 100 100');
    // Segments shorter than two radii share what they have, so neighbouring corners never overlap.
    expect(
      splinePath([
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 40, y: 0 },
      ]),
    ).toBe('M 0 0 L 10 0 Q 20 0, 30 0 L 40 0');
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
});
