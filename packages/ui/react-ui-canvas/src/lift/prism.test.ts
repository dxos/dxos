//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Point } from '@dxos/scene';

import { SHAPE_RECIPES, shapeOutline } from '../utils/index.ts';
import { prismMesh, triangulate } from './prism.ts';

const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/** An L: a square with its top-right quarter cut away, so one corner turns inward. */
const ELL: Point[] = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 0.5, y: 0.5 },
  { x: 1, y: 0.5 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

const area = (points: readonly Point[]) =>
  Math.abs(
    points.reduce((sum, { x, y }, index) => {
      const next = points[(index + 1) % points.length];
      return sum + x * next.y - next.x * y;
    }, 0),
  ) / 2;

/** The volume the triangles enclose, positive where every face is wound counter-clockwise seen from outside. */
const volume = (positions: readonly number[], indices: readonly number[]) => {
  const vertex = (index: number) => [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
  let total = 0;
  for (let corner = 0; corner < indices.length; corner += 3) {
    const [a, b, c] = [vertex(indices[corner]), vertex(indices[corner + 1]), vertex(indices[corner + 2])];
    total +=
      a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return total / 6;
};

/** Whether every edge is shared by two triangles that run it in opposite directions: a closed, consistent surface. */
const closed = (indices: readonly number[]) => {
  const edges = new Map<string, number>();
  for (let corner = 0; corner < indices.length; corner += 3) {
    for (const [from, to] of [
      [indices[corner], indices[corner + 1]],
      [indices[corner + 1], indices[corner + 2]],
      [indices[corner + 2], indices[corner]],
    ]) {
      edges.set(`${from}>${to}`, (edges.get(`${from}>${to}`) ?? 0) + 1);
    }
  }
  return [...edges.entries()].every(([edge, count]) => {
    const [from, to] = edge.split('>');
    return count === 1 && edges.get(`${to}>${from}`) === 1;
  });
};

describe('triangulate', () => {
  test('a polygon of n vertices is cut into n − 2 triangles that cover it, a corner that turns inward included', ({
    expect,
  }) => {
    for (const polygon of [SQUARE, ELL, [...ELL].reverse()]) {
      const triangles = triangulate(polygon);
      expect(triangles).toHaveLength((polygon.length - 2) * 3);
      let covered = 0;
      for (let corner = 0; corner < triangles.length; corner += 3) {
        covered += area([polygon[triangles[corner]], polygon[triangles[corner + 1]], polygon[triangles[corner + 2]]]);
      }
      expect(covered).toBeCloseTo(area(polygon));
    }
  });
});

describe('prismMesh', () => {
  test('a square stands as the unit cube: closed, its faces outward, its outline on the ground against canvas y', ({
    expect,
  }) => {
    const mesh = prismMesh(SQUARE);
    expect(mesh).toBeDefined();
    const { positions = [], indices = [] } = mesh ?? {};
    expect(positions).toHaveLength(8 * 3);
    // Two caps of two triangles and four sides of two.
    expect(indices).toHaveLength(12 * 3);
    expect(closed(indices)).toBe(true);
    expect(volume(positions, indices)).toBeCloseTo(1);
    // The canvas's top-left corner is at −x and +z: the canvas's y runs down, the ground's z up the screen.
    expect(positions.slice(0, 3)).toEqual([-0.5, 0.5, 0.5]);
  });

  test('either way round, an outline with an inward corner stands closed with its faces outward', ({ expect }) => {
    for (const outline of [ELL, [...ELL].reverse()]) {
      const mesh = prismMesh(outline);
      expect(mesh && closed(mesh.indices)).toBe(true);
      expect(mesh && volume(mesh.positions, mesh.indices)).toBeCloseTo(area(outline));
    }
  });

  test('every recipe stands as a closed solid over its outline', ({ expect }) => {
    const size = { width: 192, height: 96 };
    for (const recipe of SHAPE_RECIPES) {
      const outline = shapeOutline(recipe, size, undefined).map(({ x, y }) => ({
        x: x / size.width,
        y: y / size.height,
      }));
      const mesh = prismMesh(outline);
      expect(mesh && closed(mesh.indices)).toBe(true);
      expect(mesh && volume(mesh.positions, mesh.indices)).toBeCloseTo(area(outline));
    }
  });

  test('one outline has one key, and fewer than three points make no solid', ({ expect }) => {
    expect(prismMesh(SQUARE)?.key).toBe(prismMesh([...SQUARE])?.key);
    expect(prismMesh(SQUARE)?.key).not.toBe(prismMesh(ELL)?.key);
    expect(prismMesh(SQUARE.slice(0, 2))).toBeUndefined();
  });
});
