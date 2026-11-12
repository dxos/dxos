//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_GRID, type Endpoint, type Link, MAJOR_GRID, type Side } from '@dxos/scene';

import { ViewBuilder } from '../builder/index.ts';
import { defaultNodeRegistry } from '../components/index.ts';
import { type RenderList2D } from '../model/index.ts';
import { type LatticeSpec } from './lattice.ts';
import {
  type RouteEnd,
  insertIndex,
  linkGeometry,
  linkPath,
  orthoPoints,
  sideToward,
  smartPoints,
  splinePath,
  viewLinkGeometry,
} from './route.ts';

// The lattice these positions are worked out on: a pitch of 384 by 192.
const LATTICE: LatticeSpec = { width: 256, height: 128, gutterX: 128, gutterY: 64 };

const from = { point: { x: 0, y: 0 }, side: 'e' as const };
const to = { point: { x: 300, y: 0 }, side: 'w' as const };
const ends = { source: { node: 'a' }, target: { node: 'b' }, z: 'z' };

/** A smart link's stub out of a port: half a major cell. */
const STUB = MAJOR_GRID / 2;

/** A right angle's radius: one minor cell. */
const RADIUS = DEFAULT_GRID;

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
      { x: STUB, y: 0 },
      { x: 300 - STUB, y: 0 },
      { x: 300, y: 0 },
    ]);
    // Two ports on the same side leave the same way, so the route doubles back through the middle
    // segment rather than cutting across either node — the elbow the ports imply.
    expect(smartPoints({ point: { x: 0, y: 0 }, side: 'e' }, { point: { x: 0, y: 200 }, side: 'e' })).toEqual([
      { x: 0, y: 0 },
      { x: STUB, y: 0 },
      { x: STUB, y: 200 },
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
    // A right angle is cut one minor cell back along each segment; the corner is the quadratic's control, so the
    // route bends around it and never reaches it.
    expect(
      splinePath([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ]),
    ).toBe(`M 0 0 L ${100 - RADIUS} 0 Q 100 0, 100 ${RADIUS} L 100 100`);
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
    const {
      views: [scene],
    } = ViewBuilder.view('s', [
      ViewBuilder.rect('a', { x: 0, y: 0, width: 256, height: 128 }),
      ViewBuilder.link('line', '@-200,64', '@-100,64').id('free'),
      ViewBuilder.link('line', '@640,64', 'a').id('half'),
    ]).build();
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

  test('a curve runs straight to a free end rather than turning to its side', ({ expect }) => {
    const port = { point: { x: 0, y: 0 }, side: 'e' as const };
    const free = { point: { x: 100, y: 37 }, side: 'w' as const, free: true };
    // A curve's control point at a free end is the end itself.
    expect(
      linkPath({ type: 'curve', id: 'c', z: 'a', source: { node: 'n' }, target: { point: free.point } }, port, free),
    ).toMatch(/, 100 37, 100 37$/);
  });

  test('a smart link to a free end is an even elbow: two turns, halfway between its ends', ({ expect }) => {
    const free = (x: number, y: number) => ({ point: { x, y }, side: 'w' as const, free: true });
    // Neither end on a port: it runs sideways first, and the split is at the middle wherever the far end is.
    expect(smartPoints(free(0, 0), free(200, 80))).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 200, y: 80 },
    ]);
    expect(smartPoints(free(0, 0), free(40, 300))[1]).toEqual({ x: 20, y: 0 });
    // From a port it leaves along the port's own axis, so a port on top turns halfway down instead.
    expect(smartPoints({ point: { x: 0, y: 0 }, side: 's' }, free(200, 80))).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 40 },
      { x: 200, y: 40 },
      { x: 200, y: 80 },
    ]);
    // Ends that line up join straight, with nothing to split.
    expect(smartPoints(free(0, 0), free(200, 0))).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]);
  });

  test('on a lattice a link with a free end takes no gutter, so its elbow is as even as anywhere', ({ expect }) => {
    const link: Link = {
      type: 'smart',
      id: 'free',
      z: 'a1',
      source: { point: { x: 0, y: 240 } },
      target: { point: { x: 340, y: 70 } },
    };
    const scene: RenderList2D = { id: 'root', nodes: {}, links: { free: link } };
    const [geometry] = viewLinkGeometry(scene, defaultNodeRegistry, [link], LATTICE);
    // The vertical run is midway between the ends (x = 170), not on the gutter line nearest them.
    expect(geometry.path).toMatch(/^M 0 240 L 1\d\d(\.\d+)? 240 Q 170 240, 170 /);
    expect(geometry.path).toMatch(/ L 340 70$/);
  });

  test('on a lattice a smart link takes the ports whose gutter route bends least', ({ expect }) => {
    // MESH on (4, 1) and EDGE on (3, 4), as the Composer overview has them: the nearest ports (MESH's bottom-left,
    // EDGE's top-right) need two bends round EDGE's corner; down the free column and in from the east needs one.
    const box = (id: string, col: number, row: number) => ({
      type: 'rect',
      id,
      z: 'a0',
      center: { x: col * 384, y: row * 192 },
      size: { width: 256, height: 128 },
    });
    const link: Link = { type: 'smart', id: 'link', z: 'a1', source: { node: 'mesh' }, target: { node: 'edge' } };
    const scene: RenderList2D = {
      id: 'root',
      nodes: { mesh: box('mesh', 4, 1), edge: box('edge', 3, 4) },
      links: { link },
    };
    const [geometry] = viewLinkGeometry(scene, defaultNodeRegistry, [link], LATTICE);
    expect([geometry.source.side, geometry.source.point, geometry.target.side, geometry.target.point]).toEqual([
      's',
      { x: 1536, y: 256 },
      'e',
      { x: 1280, y: 768 },
    ]);
    // One bend: a single rounded corner between the two straight runs.
    expect(geometry.path.match(/Q/g)).toHaveLength(1);
    // The same choice for the link on its own, so hit-testing and handles agree with what is drawn.
    const single = linkGeometry(scene, defaultNodeRegistry, link, LATTICE);
    expect([single?.source.side, single?.target.side]).toEqual(['s', 'e']);
  });

  test('a smart link to a shape off the lattice cells, as one in flight is, takes no gutter, so it does not flicker', ({
    expect,
  }) => {
    const box = (id: string, x: number, y: number) => ({
      type: 'rect',
      id,
      z: 'a0',
      center: { x, y },
      size: { width: 256, height: 128 },
    });
    const link: Link = { type: 'smart', id: 'ac', z: 'a1', source: { node: 'a' }, target: { node: 'c' } };
    // C dragged along a diagonal between cells: gutter routing flipped its ports between two tied pairs every few px.
    const sides = Array.from({ length: 60 }, (_, step) => {
      const scene: RenderList2D = {
        id: 'root',
        nodes: { a: box('a', 0, 0), c: box('c', 6 + step * 6.4, 195 + step * 3.2) },
        links: { link },
      };
      const [geometry] = viewLinkGeometry(scene, defaultNodeRegistry, [link], LATTICE);
      expect(geometry.path).toBe(linkGeometry(scene, defaultNodeRegistry, link)?.path);
      return `${geometry.source.side}${geometry.target.side}`;
    });
    // The ports change only where the geometry turns a corner, never back and forth: no pair returns once left.
    const runs = sides.filter((side, index) => index === 0 || side !== sides[index - 1]);
    expect(new Set(runs).size).toBe(runs.length);
  });

  test('a plain line to a node with no port points at its centre and stops at its outline; a smart one takes ports', ({
    expect,
  }) => {
    // A rect at (0, 0) and an ellipse up and to the right, 200 × 100 each.
    const {
      views: [view],
    } = ViewBuilder.view('v', [
      ViewBuilder.rect('a', { x: -100, y: -50, width: 200, height: 100 }),
      ViewBuilder.ellipse('b', { x: 300, y: -350, width: 200, height: 100 }),
    ]).build();
    const geometry = (type: Link['type'], source: Endpoint = { node: 'a' }, target: Endpoint = { node: 'b' }) => {
      const link: Link =
        type === 'spline'
          ? { type, id: 'l', z: 'z', source, target, points: [] }
          : { type, id: 'l', z: 'z', source, target };
      return linkGeometry(view, defaultNodeRegistry, link);
    };
    // The centres are (0, 0) and (400, -300): the line runs along that diagonal.
    const line = geometry('line');
    const onDiagonal = (point: { x: number; y: number }) => expect(point.x * -300 - point.y * 400).toBeCloseTo(0, 6);
    onDiagonal(line?.source.point ?? { x: NaN, y: NaN });
    // It leaves the rect where the diagonal crosses its top edge, and meets the ellipse on its outline.
    expect(line?.source.point.y).toBeCloseTo(-50, 6);
    const end = line?.target.point ?? { x: NaN, y: NaN };
    onDiagonal(end);
    expect(((end.x - 400) / 100) ** 2 + ((end.y + 300) / 50) ** 2).toBeCloseTo(1, 6);
    // A named port is used as given.
    const ported = geometry('line', { node: 'a', port: 'e2' });
    expect(ported?.source.point).toEqual({ x: 100, y: 0 });
    // A smart line attaches at ports, on the frame's sides.
    const smart = geometry('smart');
    expect([smart?.source.side, smart?.target.side].every((side) => side !== undefined)).toBe(true);
    expect(Math.abs(smart?.source.point.x ?? 0) === 100 || Math.abs(smart?.source.point.y ?? 0) === 50).toBe(true);
  });
});

describe('orthogonal routes', () => {
  const end = (x: number, y: number, side: Side, free?: boolean): RouteEnd => ({
    point: { x, y },
    side,
    ...(free ? { free: true } : {}),
  });

  test('ends that line up on an axis run straight, with no bend', ({ expect }) => {
    expect(orthoPoints(end(0, 0, 'e'), end(100, 0, 'w'))).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    expect(orthoPoints(end(0, 0, 's'), end(0, 100, 'n'))).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ]);
  });

  test('perpendicular sides meet at one corner', ({ expect }) => {
    expect(orthoPoints(end(0, 0, 'e'), end(100, 60, 'n'))).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 60 },
    ]);
  });

  test('facing sides turn twice, at the midpoint between them', ({ expect }) => {
    expect(orthoPoints(end(0, 0, 'e'), end(100, 60, 'w'))).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 60 },
      { x: 100, y: 60 },
    ]);
    expect(orthoPoints(end(0, 0, 's'), end(100, 60, 'n'))).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 30 },
      { x: 100, y: 30 },
      { x: 100, y: 60 },
    ]);
  });

  test('a free end takes whichever axis the other does not, so a drag reads as a route', ({ expect }) => {
    // Dragging away from a port on the east side: the route leaves sideways and turns once.
    expect(orthoPoints(end(0, 0, 'e'), end(100, 60, 'n', true))).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 60 },
    ]);
  });

  test('a dragged end does not move the corner across the line as it crosses the diagonal', ({ expect }) => {
    // The far end a little above the diagonal, then a little below it: the corner stays on the same side of the line.
    const corner = (route: readonly { x: number; y: number }[]) => route.slice(1, -1);
    for (const [above, below] of [
      [end(100, 98, 's', true), end(100, 102, 'e', true)],
      [end(-100, 98, 's', true), end(-100, 102, 'w', true)],
    ]) {
      // Both ends free: the route leaves sideways, whichever way the far end lies.
      expect(corner(orthoPoints(end(0, 0, 'e', true), above))).toEqual([{ x: above.point.x, y: 0 }]);
      expect(corner(orthoPoints(end(0, 0, 's', true), below))).toEqual([{ x: below.point.x, y: 0 }]);
      // The free end dragged, the other on a port: one corner on the port's axis, never the mid-span pair of turns.
      expect(corner(orthoPoints(above, end(0, 0, 'w')))).toEqual([{ x: above.point.x, y: 0 }]);
      expect(corner(orthoPoints(below, end(0, 0, 'w')))).toEqual([{ x: below.point.x, y: 0 }]);
      expect(corner(orthoPoints(above, end(0, 0, 'n')))).toEqual([{ x: 0, y: above.point.y }]);
      expect(corner(orthoPoints(below, end(0, 0, 'n')))).toEqual([{ x: 0, y: below.point.y }]);
    }
  });

  test('the route depends only on its own two ends, so an unrelated shape never moves it', ({ expect }) => {
    const first = orthoPoints(end(0, 0, 'e'), end(100, 60, 'w'));
    const second = orthoPoints(end(0, 0, 'e'), end(100, 60, 'w'));
    expect(first).toEqual(second);
  });
});
