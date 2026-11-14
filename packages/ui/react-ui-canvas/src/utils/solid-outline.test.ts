//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type NodeBase, type Point } from '@dxos/scene';

import { flattenPath } from './path.ts';
import { type Ring, type SolidNode, combineRings, nodeRings, solidPath, solidRings } from './solid-outline.ts';

/** The area a ring encloses, signed by the way round it runs. */
const signedArea = (ring: Ring): number =>
  ring.reduce((sum, { x, y }, index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + (x * next.y - next.x * y) / 2;
  }, 0);

/** The area rings fill: holes run the other way round from outsides, so they take theirs away. */
const area = (rings: readonly Ring[]): number => Math.abs(rings.reduce((sum, ring) => sum + signedArea(ring), 0));

const box = (x: number, y: number, width: number, height: number): Point[] => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
];

const node = (id: string, type: string, x: number, y: number, width: number, height: number, more = {}): NodeBase => ({
  id,
  type,
  z: 'a0',
  center: { x: x + width / 2, y: y + height / 2 },
  size: { width, height },
  ...more,
});

const solid = (id: string, op: string, operands: string, x: number, y: number, width: number, height: number) => {
  const made: SolidNode = { ...node(id, 'solid', x, y, width, height), type: 'solid', op, operands };
  return made;
};

const lookupOf =
  (...nodes: NodeBase[]) =>
  (id: string) =>
    nodes.find((candidate) => candidate.id === id);

describe('flattenPath arcs', () => {
  test('two half-turn arcs are a circle', ({ expect }) => {
    const [ring] = flattenPath('M 0 50 A 50 50 0 0 1 100 50 A 50 50 0 0 1 0 50 Z');
    expect(Math.abs(signedArea(ring))).toBeCloseTo(Math.PI * 50 * 50, -2);
    expect(ring.every(({ x, y }) => Math.abs(Math.hypot(x - 50, y - 50) - 50) < 0.01)).toBe(true);
  });

  test('the large flag takes the long way round, and radii too small are grown to reach', ({ expect }) => {
    const [short] = flattenPath('M 0 0 A 10 10 0 0 1 10 10 Z');
    const [long] = flattenPath('M 0 0 A 10 10 0 1 1 10 10 Z');
    expect(Math.abs(signedArea(long))).toBeGreaterThan(Math.abs(signedArea(short)) * 5);
    const [grown] = flattenPath('M 0 0 A 1 1 0 0 1 20 0');
    expect(Math.max(...grown.map(({ y }) => Math.abs(y)))).toBeCloseTo(10, 1);
  });
});

describe('combineRings', () => {
  test('two boxes that overlap join into one outline, whichever way round each was drawn', ({ expect }) => {
    const [left, right] = [box(0, 0, 100, 100), box(50, 50, 100, 100)];
    const joined = combineRings('union', [[left], [[...right].reverse()]]);
    expect(joined).toHaveLength(1);
    expect(area(joined)).toBeCloseTo(100 * 100 * 2 - 50 * 50, 0);
  });

  test('two boxes that share an edge join into one box', ({ expect }) => {
    const joined = combineRings('union', [[box(0, 0, 100, 100)], [box(100, 0, 100, 100)]]);
    expect(joined).toHaveLength(1);
    expect(area(joined)).toBeCloseTo(200 * 100, 0);
  });

  test('boxes apart stay two outlines', ({ expect }) => {
    expect(combineRings('union', [[box(0, 0, 10, 10)], [box(50, 0, 10, 10)]])).toHaveLength(2);
  });

  test('a box cut from the middle of another leaves a hole that runs the other way round', ({ expect }) => {
    const cut = combineRings('difference', [[box(0, 0, 100, 100)], [box(25, 25, 50, 50)]]);
    expect(cut).toHaveLength(2);
    expect(Math.sign(signedArea(cut[0]))).toBe(-Math.sign(signedArea(cut[1])));
    expect(area(cut)).toBeCloseTo(100 * 100 - 50 * 50, 0);
  });

  test('every tool after the first is cut from the base, and one that covers it leaves nothing', ({ expect }) => {
    const cut = combineRings('difference', [[box(0, 0, 100, 100)], [box(0, 0, 50, 100)], [box(50, 0, 50, 50)]]);
    expect(area(cut)).toBeCloseTo(50 * 50, 0);
    expect(combineRings('difference', [[box(0, 0, 10, 10)], [box(-5, -5, 20, 20)]])).toEqual([]);
  });
});

describe('nodeRings', () => {
  test('a box is its frame, turned as the node is', ({ expect }) => {
    expect(area(nodeRings(node('a', 'rect', 0, 0, 100, 60)))).toBeCloseTo(6000, 0);
    const [turned] = nodeRings(node('a', 'rect', -50, -30, 100, 60, { rotation: 90 }));
    expect(Math.max(...turned.map(({ y }) => y))).toBeCloseTo(50, 5);
    expect(Math.max(...turned.map(({ x }) => x))).toBeCloseTo(30, 5);
  });

  test("a parametric shape is its recipe's outline, so a join or a cut takes the arrow and not its frame", ({
    expect,
  }) => {
    // A 200 by 100 arrow with a 50 px head and a 60 px shaft: the shaft's box and the head's triangle.
    const arrow = node('a', 'shape', 0, 0, 200, 100, { recipe: 'arrow', params: { head: 0.5, shaft: 0.6 } });
    expect(area(nodeRings(arrow))).toBeCloseTo(150 * 60 + (50 * 100) / 2);
    // A recipe this build does not have is its frame.
    expect(area(nodeRings(node('b', 'shape', 0, 0, 200, 100, { recipe: 'unknown' })))).toBeCloseTo(20000);
  });

  test('an ellipse, a polygon and a cloud are their own outlines, inside their frames', ({ expect }) => {
    expect(area(nodeRings(node('e', 'ellipse', 0, 0, 100, 60)))).toBeCloseTo(Math.PI * 50 * 30, -2);
    const triangle = nodeRings(node('p', 'polygon', 0, 0, 100, 100, { params: { sides: 3 } }));
    expect(triangle[0].length).toBeLessThan(6);
    expect(area(triangle)).toBeLessThan(100 * 100 * 0.6);
    const cloud = area(nodeRings(node('c', 'cloud', 0, 0, 120, 80)));
    expect(cloud).toBeGreaterThan(120 * 80 * 0.5);
    expect(cloud).toBeLessThan(120 * 80);
  });

  test('a closed line is its outline, and an open one encloses nothing', ({ expect }) => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    expect(area(nodeRings(node('l', 'polyline', 0, 0, 100, 100, { points, params: { closed: true } })))).toBeCloseTo(
      5000,
      0,
    );
    expect(nodeRings(node('l', 'polyline', 0, 0, 100, 100, { points }))).toEqual([]);
  });
});

describe('solidRings', () => {
  const [a, b] = [node('a', 'rect', 0, 0, 100, 100), node('b', 'rect', 50, 50, 100, 100)];

  test('a union is drawn in the box of all its operands, in unit space', ({ expect }) => {
    const rings = solidRings(solid('u', 'union', 'a b', 0, 0, 150, 150), lookupOf(a, b));
    expect(rings).toHaveLength(1);
    expect(area(rings ?? [])).toBeCloseTo((100 * 100 * 2 - 50 * 50) / (150 * 150), 3);
    const all = (rings ?? []).flat();
    expect([Math.min(...all.map(({ x }) => x)), Math.max(...all.map(({ x }) => x))]).toEqual([0, 1]);
  });

  test("a difference is drawn in its base's box", ({ expect }) => {
    const rings = solidRings(solid('d', 'difference', 'a b', 0, 0, 100, 100), lookupOf(a, b));
    expect(area(rings ?? [])).toBeCloseTo(0.75, 3);
  });

  test('a solid of a solid is worked out through it, where each stands', ({ expect }) => {
    const inner = solid('u', 'union', 'a b', 0, 0, 150, 150);
    const hole = node('h', 'ellipse', 50, 50, 50, 50);
    const rings = solidRings(solid('d', 'difference', 'u h', 0, 0, 150, 150), lookupOf(a, b, inner, hole));
    expect(rings).toHaveLength(2);
    expect(area(rings ?? []) * 150 * 150).toBeCloseTo(100 * 100 * 2 - 50 * 50 - Math.PI * 25 * 25, -1);
  });

  test('a solid moved and sized after it was made takes its operands with it', ({ expect }) => {
    // The inner solid was framed at (0, 0) 150 square, and now stands at twice the size somewhere else.
    const inner = solid('u', 'union', 'a b', 1000, 1000, 300, 300);
    const [ring] = nodeRings(inner, lookupOf(a, b));
    expect(area([ring])).toBeCloseTo((100 * 100 * 2 - 50 * 50) * 4, 0);
    expect(Math.min(...ring.map(({ x }) => x))).toBeCloseTo(1000, 5);
  });

  test('a missing operand, an unknown operation or a solid made of itself has no outline', ({ expect }) => {
    expect(solidRings(solid('u', 'union', 'a missing', 0, 0, 10, 10), lookupOf(a))).toBeUndefined();
    expect(solidRings(solid('u', 'extrude', 'a', 0, 0, 10, 10), lookupOf(a))).toBeUndefined();
    const self = solid('u', 'union', 'a u', 0, 0, 100, 100);
    expect(solidRings(self, lookupOf(a, self))).toBeDefined();
    const [first, second] = [solid('s1', 'union', 's2', 0, 0, 100, 100), solid('s2', 'union', 's1', 0, 0, 100, 100)];
    expect(solidRings(first, lookupOf(first, second))).toBeUndefined();
  });
});

describe('solidPath', () => {
  test('each ring is a closed subpath in the frame, kept inside its inset', ({ expect }) => {
    const path = solidPath({ width: 100, height: 50 }, [box(0, 0, 1, 1), box(0.25, 0.25, 0.5, 0.5)], 2);
    expect(path).toBe('M 2 2 L 98 2 L 98 48 L 2 48 Z M 26 13.5 L 74 13.5 L 74 36.5 L 26 36.5 Z');
  });

  test('with no outline it is the frame', ({ expect }) => {
    expect(solidPath({ width: 10, height: 10 }, undefined)).toBe('M 0 0 L 10 0 L 10 10 L 0 10 Z');
  });
});
