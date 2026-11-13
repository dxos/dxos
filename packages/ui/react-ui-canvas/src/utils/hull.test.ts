//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type HullNode, type HullShape, type Link, type Node, type Point, isHullNode } from '@dxos/scene';

import { defaultNodeRegistry } from '../components/index.ts';
import { type RenderList2D } from '../model/index.ts';
import { insertNode } from './edits.ts';
import { wallCrossings } from './gutter-route.ts';
import {
  HULL_MARGIN,
  HULL_STYLE,
  type Wall,
  enclose,
  fitHulls,
  hullMembers,
  hullOutline,
  hullRegions,
  hullTiles,
  tilesOutline,
} from './hull.ts';
import { type LatticeSpec, cellBounds } from './lattice.ts';
import { latticeEnds, latticeRoute } from './route.ts';
import { createNode } from './shapes.ts';

// The lattice these positions are worked out on: a pitch of 384 by 192.
const spec: LatticeSpec = { width: 256, height: 128, gutterX: 128, gutterY: 64 };

/** A one-cell shape on the lattice, inside the hull `parent` when it names one. */
const cell = (id: string, col: number, row: number, parent?: string): Node => {
  const { x, y, width, height } = cellBounds({ col, row, spanX: 1, spanY: 1 }, spec);
  return {
    ...createNode({
      type: 'rect',
      id,
      z: id,
      center: { x: x + width / 2, y: y + height / 2 },
      size: { width, height },
    }),
    ...(parent ? { parent } : {}),
  };
};

const hull = (id: string, shape?: HullShape, parent?: string): Node => ({
  ...createNode({ type: 'hull', id, z: `0${id}`, center: { x: 0, y: 0 }, size: { width: 10, height: 10 } }),
  ...(shape ? { shape } : {}),
  ...(parent ? { parent } : {}),
});

/** A hull drawn `count` grid cells inside its line; any other node as it is. */
const inset = (node: Node, count: number): Node => {
  if (!isHullNode(node)) {
    return node;
  }
  const drawn: HullNode = { ...node, inset: count };
  return drawn;
};

const sceneOf = (nodes: readonly Node[], links: readonly Link[] = []): RenderList2D => ({
  id: 'root',
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  links: Object.fromEntries(links.map((link) => [link.id, link])),
});

const smart = (id: string, source: string, target: string): Link => ({
  type: 'smart',
  id,
  z: `z${id}`,
  source: { node: source },
  target: { node: target },
});

/** The points a smart link's gutter route runs through, its two ports included. */
const routeOf = (nodes: readonly Node[], link: Link): Point[] => {
  const scene = sceneOf(nodes, [link]);
  return latticeEnds(scene, defaultNodeRegistry, link, latticeRoute(scene, spec))?.points ?? [];
};

/** Whether any run of the route lies on a wall. */
const onWall = (route: readonly Point[], walls: readonly Wall[]): boolean =>
  route.slice(1).some((to, index) => {
    const from = route[index];
    return walls.some((wall) =>
      wall.from.y === wall.to.y
        ? from.y === to.y &&
          from.y === wall.from.y &&
          Math.min(from.x, to.x) < Math.max(wall.from.x, wall.to.x) &&
          Math.max(from.x, to.x) > Math.min(wall.from.x, wall.to.x)
        : from.x === to.x &&
          from.x === wall.from.x &&
          Math.min(from.y, to.y) < Math.max(wall.from.y, wall.to.y) &&
          Math.max(from.y, to.y) > Math.min(wall.from.y, wall.to.y),
    );
  });

// An L of three shapes inside the hull H, and two outside it:
//
//   col   0   1   2   3
//   row 0 A   B   .   X
//   row 1 C   .   .   Y
const corner = (shape?: HullShape) => [
  hull('h', shape),
  cell('a', 0, 0, 'h'),
  cell('b', 1, 0, 'h'),
  cell('c', 0, 1, 'h'),
  cell('x', 3, 0),
  cell('y', 3, 1),
];

describe('hull', () => {
  test('the nodes inside a hull are those of every hull inside it, and a loop of parents ends', ({ expect }) => {
    const nodes = [
      hull('outer'),
      hull('inner', undefined, 'outer'),
      cell('a', 0, 0, 'outer'),
      cell('b', 1, 0, 'inner'),
    ];
    expect(
      hullMembers(nodes, 'outer')
        .map((node) => node.id)
        .sort(),
    ).toEqual(['a', 'b']);
    expect(hullMembers(nodes, 'inner').map((node) => node.id)).toEqual(['b']);
    const loop = [hull('p', undefined, 'q'), hull('q', undefined, 'p'), cell('a', 0, 0, 'p')];
    expect(hullMembers(loop, 'p').map((node) => node.id)).toEqual(['a']);
  });

  test('on a lattice a perimeter runs round its tiles along gutter centre lines', ({ expect }) => {
    const [h, ...rest] = corner();
    expect(isHullNode(h) && hullOutline([h, ...rest], h, spec)).toEqual([
      { x: -192, y: -96 },
      { x: 576, y: -96 },
      { x: 576, y: 96 },
      { x: 192, y: 96 },
      { x: 192, y: 288 },
      { x: -192, y: 288 },
    ]);
  });

  test('on a lattice a box bounds its tiles, the free one among them', ({ expect }) => {
    const [h, ...rest] = corner('box');
    expect(isHullNode(h) && hullOutline([h, ...rest], h, spec)).toEqual([
      { x: -192, y: -96 },
      { x: 576, y: -96 },
      { x: 576, y: 288 },
      { x: -192, y: 288 },
    ]);
  });

  test('a perimeter joins shapes standing apart, round a shape that is not inside it', ({ expect }) => {
    const apart = [hull('h'), cell('a', 0, 0, 'h'), cell('b', 2, 0, 'h')];
    const [h] = apart;
    expect(isHullNode(h) && [...hullTiles(apart, h, spec)].sort()).toEqual(['0,0', '1,0', '2,0']);
    const blocked = [...apart, cell('other', 1, 0)];
    const tiles = isHullNode(h) ? hullTiles(blocked, h, spec) : new Set<string>();
    expect(tiles.has('1,0')).toBe(false);
    // One row over and back: three tiles join the two.
    expect(tiles.size).toBe(5);
    expect(tilesOutline(tiles, spec).length).toBe(8);
  });

  test('off a lattice a box stands a margin off its nodes and a perimeter is their convex hull', ({ expect }) => {
    const at = (id: string, x: number, y: number): Node => ({
      ...createNode({ type: 'rect', id, z: id, center: { x, y }, size: { width: 100, height: 50 } }),
      parent: 'h',
    });
    const members = [at('a', 0, 0), at('b', 300, 0), at('c', 0, 200)];
    const box = fitHulls(sceneOf([hull('h', 'box'), ...members])).nodes.h;
    expect([box.center, box.size]).toEqual([
      { x: 150, y: 100 },
      { width: 400 + 2 * HULL_MARGIN, height: 250 + 2 * HULL_MARGIN },
    ]);
    const fitted = fitHulls(sceneOf([hull('h'), ...members]));
    const perimeter = fitted.nodes.h;
    // The far corner of the box is cut off: the hull runs from B's corner to C's.
    expect(isHullNode(perimeter) && perimeter.points?.length).toBe(5);
    expect(isHullNode(perimeter) && perimeter.points?.some((point) => point.x === 1 && point.y === 1)).toBe(false);
    // A scene already fitted is the same scene, so nothing downstream redraws.
    expect(fitHulls(fitted)).toBe(fitted);
  });

  test('a hull with nothing inside it keeps the frame it was given', ({ expect }) => {
    const scene = sceneOf([hull('h'), cell('a', 0, 0)]);
    expect(fitHulls(scene, spec)).toBe(scene);
  });
});

describe('enclose', () => {
  test('a new hull holds the nodes named, under everything, fitted as it is made', ({ expect }) => {
    const scene = sceneOf([cell('a', 0, 0), cell('b', 1, 0), cell('x', 3, 0)]);
    const made = enclose(scene, ['a', 'b'], 'h', { lattice: spec });
    const hull = made?.nodes.h;
    expect(hull && isHullNode(hull) && [hull.parent, hull.style]).toEqual([undefined, HULL_STYLE]);
    expect([made?.nodes.a.parent, made?.nodes.b.parent, made?.nodes.x.parent]).toEqual(['h', 'h', undefined]);
    expect(Object.values(made?.nodes ?? {}).every((node) => node.id === 'h' || node.z > (hull?.z ?? ''))).toBe(true);
    // The two tiles of row 0.
    expect([hull?.center, hull?.size]).toEqual([
      { x: 192, y: 0 },
      { width: 768, height: 192 },
    ]);
  });

  test('a hull named goes in whole: it stands inside the new one, and keeps what is inside it', ({ expect }) => {
    // A and B in the hull H1, and C beside it: all four selected, as Select all leaves them.
    const scene = sceneOf([hull('h1'), cell('a', 0, 0, 'h1'), cell('b', 1, 0, 'h1'), cell('c', 0, 1)]);
    const made = enclose(scene, ['a', 'b', 'h1', 'c'], 'h2', { lattice: spec });
    expect(['a', 'b', 'c', 'h1', 'h2'].map((id) => made?.nodes[id].parent)).toEqual([
      'h1',
      'h1',
      'h2',
      'h2',
      undefined,
    ]);
    const nodes = Object.values(made?.nodes ?? {});
    expect(hullMembers(nodes, 'h1').map((node) => node.id)).toEqual(['a', 'b']);
    expect(
      hullMembers(nodes, 'h2')
        .map((node) => node.id)
        .sort(),
    ).toEqual(['a', 'b', 'c']);
    // The outer hull is drawn under the inner, so the inner's border is not covered.
    expect((made?.nodes.h2.z ?? '') < (made?.nodes.h1.z ?? '')).toBe(true);
    // Each is fitted round what it holds: the inner the two tiles of row 0, the outer those and C's.
    expect(made?.nodes.h1.size).toEqual({ width: 768, height: 192 });
    expect(made?.nodes.h2.size).toEqual({ width: 768, height: 384 });
  });

  test('nodes of one hull are enclosed inside it; nodes of different hulls leave theirs', ({ expect }) => {
    const scene = sceneOf(corner());
    const inside = enclose(scene, ['a', 'b'], 'inner', { lattice: spec });
    expect(['a', 'b', 'c', 'inner', 'h'].map((id) => inside?.nodes[id].parent)).toEqual([
      'inner',
      'inner',
      'h',
      'h',
      undefined,
    ]);
    // Over the hull it stands in, and under everything else.
    const [outer, inner] = [inside?.nodes.h.z ?? '', inside?.nodes.inner.z ?? ''];
    expect(
      outer < inner && Object.values(inside?.nodes ?? {}).every((node) => isHullNode(node) || node.z > inner),
    ).toBe(true);
    expect(
      hullMembers(Object.values(inside?.nodes ?? {}), 'h')
        .map((node) => node.id)
        .sort(),
    ).toEqual(['a', 'b', 'c']);

    const across = enclose(scene, ['a', 'x'], 'new', { lattice: spec });
    expect(['a', 'x', 'new'].map((id) => across?.nodes[id].parent)).toEqual(['new', 'new', undefined]);
    expect(
      hullMembers(Object.values(across?.nodes ?? {}), 'h')
        .map((node) => node.id)
        .sort(),
    ).toEqual(['b', 'c']);
  });

  test('nothing is made of ids that are not nodes, or under an id that is taken', ({ expect }) => {
    const scene = sceneOf(corner());
    expect(enclose(scene, ['missing'], 'new')).toBeUndefined();
    expect(enclose(scene, ['a'], 'b')).toBeUndefined();
  });
});

describe('a hull drawn with its tool', () => {
  /** A hull as the tool lands it: its frame as it was drawn, from the top-left of one cell to the bottom-right of another. */
  const drawn = (id: string, from: readonly [number, number], to: readonly [number, number]): HullNode => {
    const [first, last] = [
      cellBounds({ col: from[0], row: from[1], spanX: 1, spanY: 1 }, spec),
      cellBounds({ col: to[0], row: to[1], spanX: 1, spanY: 1 }, spec),
    ];
    const [right, bottom] = [last.x + last.width, last.y + last.height];
    return {
      ...createNode({
        type: 'hull',
        id,
        z: 'zz',
        center: { x: (first.x + right) / 2, y: (first.y + bottom) / 2 },
        size: { width: right - first.x, height: bottom - first.y },
      }),
      type: 'hull',
    };
  };

  test('takes the shapes wholly inside its frame, as the command takes a selection', ({ expect }) => {
    const scene = sceneOf([cell('a', 0, 0), cell('b', 1, 0), cell('x', 3, 0)]);
    const made = insertNode(drawn('h', [0, 0], [1, 0]))(scene);
    expect(['a', 'b', 'x', 'h'].map((id) => made.nodes[id].parent)).toEqual(['h', 'h', undefined, undefined]);
    // The same hull the command makes of the same two shapes, before either is fitted.
    const commanded = enclose(scene, ['a', 'b'], 'h');
    expect(['a', 'b', 'x', 'h'].map((id) => commanded?.nodes[id].parent)).toEqual(['h', 'h', undefined, undefined]);
    expect(Object.values(made.nodes).every((node) => node.id === 'h' || node.z > made.nodes.h.z)).toBe(true);
  });

  test('drawn round a hull and a shape, it holds both and the hull keeps its own', ({ expect }) => {
    const scene = fitHulls(sceneOf([hull('h1'), cell('a', 0, 0, 'h1'), cell('b', 1, 0, 'h1'), cell('c', 0, 1)]));
    // The frame is drawn generously round the inner hull, whose border stands a margin off its shapes.
    const outer = drawn('h2', [-1, -1], [2, 2]);
    const made = insertNode(outer)(scene);
    expect(['a', 'b', 'c', 'h1', 'h2'].map((id) => made.nodes[id].parent)).toEqual(['h1', 'h1', 'h2', 'h2', undefined]);
    expect(made.nodes.h2.z < made.nodes.h1.z).toBe(true);
  });

  test('drawn round nothing, or round a locked shape alone, it stands empty where it was drawn', ({ expect }) => {
    const locked = { ...cell('a', 0, 0), locked: true };
    const scene = sceneOf([locked, cell('x', 3, 0)]);
    const frame = drawn('h', [0, 0], [1, 0]);
    const made = insertNode(frame)(scene);
    expect([made.nodes.a.parent, made.nodes.h.center, made.nodes.h.size]).toEqual([
      undefined,
      frame.center,
      frame.size,
    ]);
  });
});

describe('hull routing', () => {
  test('a link between two shapes inside a hull stays inside it', ({ expect }) => {
    const nodes = corner();
    const [region] = hullRegions(nodes, spec);
    const route = routeOf(nodes, smart('bc', 'b', 'c'));
    expect(route.length).toBeGreaterThan(1);
    expect(wallCrossings(route, region.walls)).toBe(0);
    expect(onWall(route, region.walls)).toBe(false);
    // The gutter between A's column and B's is the hull's edge below row 0, so the route runs down the track on the
    // hull's side of that border, a quarter of the gutter in from it.
    expect(route).toEqual([
      { x: 256, y: 0 },
      { x: 160, y: 0 },
      { x: 160, y: 192 },
      { x: 128, y: 192 },
    ]);
  });

  test('a link to a shape inside a hull crosses its border once', ({ expect }) => {
    const nodes = corner();
    const [region] = hullRegions(nodes, spec);
    for (const link of [smart('xb', 'x', 'b'), smart('yc', 'y', 'c'), smart('xc', 'x', 'c')]) {
      const route = routeOf(nodes, link);
      expect(route.length).toBeGreaterThan(1);
      expect(wallCrossings(route, region.walls)).toBe(1);
      expect(onWall(route, region.walls)).toBe(false);
    }
  });

  test('a link between two shapes outside a hull goes round it', ({ expect }) => {
    // A box over M (1, -1) and N (1, 1) holds the free tile between them, which the straight way from P to Q crosses.
    const nodes = [hull('g', 'box'), cell('m', 1, -1, 'g'), cell('n', 1, 1, 'g'), cell('p', 0, 0), cell('q', 2, 0)];
    const [region] = hullRegions(nodes, spec);
    const route = routeOf(nodes, smart('pq', 'p', 'q'));
    expect(route.length).toBeGreaterThan(2);
    expect(wallCrossings(route, region.walls)).toBe(0);
    expect(onWall(route, region.walls)).toBe(false);
    // Without the hull the same link runs straight across.
    expect(routeOf(nodes.slice(1), smart('pq', 'p', 'q'))).toEqual([
      { x: 128, y: 0 },
      { x: 640, y: 0 },
    ]);
  });

  test('a link with no hull to answer to routes as it did', ({ expect }) => {
    const nodes = corner().filter((node) => !isHullNode(node));
    expect(routeOf(nodes, smart('bc', 'b', 'c'))).toEqual([
      { x: 384, y: 64 },
      { x: 384, y: 192 },
      { x: 128, y: 192 },
    ]);
  });

  test('an inset border is drawn that many grid cells inside its gutter lines, short of the last before its shapes', ({
    expect,
  }) => {
    const [h, ...rest] = corner();
    const outline = (count: number) => {
      const drawn = inset(h, count);
      return isHullNode(drawn) ? hullOutline([drawn, ...rest], drawn, spec, 16) : [];
    };
    // One cell of 16 in from every run, the inner corner as square as the outer ones.
    expect(outline(1)).toEqual([
      { x: -176, y: -80 },
      { x: 560, y: -80 },
      { x: 560, y: 80 },
      { x: 176, y: 80 },
      { x: 176, y: 272 },
      { x: -176, y: 272 },
    ]);
    // The gutter is 128 across and 64 down, so three cells fit across and one down: a cell is left for the links.
    expect(outline(9)?.slice(0, 2)).toEqual([
      { x: -144, y: -80 },
      { x: 528, y: -80 },
    ]);
    expect(outline(0)).toEqual(isHullNode(h) && hullOutline([h, ...rest], h, spec));
  });

  test('off a lattice an inset takes its grid cells off the margin, down to the shapes themselves', ({ expect }) => {
    const member: Node = {
      ...createNode({ type: 'rect', id: 'a', z: 'a', center: { x: 0, y: 0 }, size: { width: 100, height: 50 } }),
      parent: 'h',
    };
    const sized = (count: number) => {
      const scene = sceneOf([inset(hull('h', 'box'), count), member]);
      return fitHulls(scene, undefined, 12).nodes.h.size;
    };
    expect([sized(0), sized(1), sized(5)]).toEqual([
      { width: 100 + 2 * HULL_MARGIN, height: 50 + 2 * HULL_MARGIN },
      { width: 100 + 2 * (HULL_MARGIN - 12), height: 50 + 2 * (HULL_MARGIN - 12) },
      { width: 100, height: 50 },
    ]);
  });

  test('a link inside an inset hull runs between the border as drawn and the shapes', ({ expect }) => {
    const [h, ...rest] = corner();
    const fitted = fitHulls(sceneOf([inset(h, 1), ...rest]), spec, 16);
    const nodes = Object.values(fitted.nodes);
    const [region] = hullRegions(nodes, spec);
    // Each wall is where the border is drawn, and says how far inside its gutter line that is.
    expect(region.walls.map((wall) => wall.inset)).toEqual(Array.from({ length: 6 }, () => 16));
    expect(region.walls[0]).toMatchObject({ from: { x: -176, y: -80 }, to: { x: 560, y: -80 } });
    // Down the gutter between A's column and B's the border is at 176, so the track inside it is at 152, halfway to
    // C's edge at 128, where it was at 160 with the border on the line.
    const route = latticeEnds(fitted, defaultNodeRegistry, smart('bc', 'b', 'c'), latticeRoute(fitted, spec))?.points;
    expect(route).toEqual([
      { x: 256, y: 0 },
      { x: 152, y: 0 },
      { x: 152, y: 192 },
      { x: 128, y: 192 },
    ]);
    // A link from outside still crosses the border once.
    const across = latticeEnds(fitted, defaultNodeRegistry, smart('xb', 'x', 'b'), latticeRoute(fitted, spec))?.points;
    expect(wallCrossings(across ?? [], region.walls)).toBe(1);
  });

  test('an inset hull leaves its gutter line to the links outside it', ({ expect }) => {
    // P stands in the notch under B, and Q beside B, both outside the hull; R, under Q, is in the way of a straight run.
    const [h, ...rest] = corner();
    const others = [cell('p', 1, 1), cell('q', 2, 0), cell('r', 2, 1)];
    const routed = (count: number) => {
      const fitted = fitHulls(sceneOf([inset(h, count), ...rest, ...others]), spec, 16);
      const [region] = hullRegions(Object.values(fitted.nodes), spec);
      const points = latticeEnds(
        fitted,
        defaultNodeRegistry,
        smart('pq', 'p', 'q'),
        latticeRoute(fitted, spec),
      )?.points;
      return { points: points ?? [], region };
    };
    // Inset, the border beside B is at 560, so the link runs up the gutter's centre line at 576, as it would with no
    // hull there.
    const clear = routed(1);
    expect(clear.points).toEqual([
      { x: 512, y: 192 },
      { x: 576, y: 192 },
      { x: 576, y: 0 },
      { x: 640, y: 0 },
    ]);
    expect([wallCrossings(clear.points, clear.region.walls), onWall(clear.points, clear.region.walls)]).toEqual([
      0,
      false,
    ]);
    // On the line, the border takes it, and the link keeps to the track a quarter of the gutter outside it.
    const pushed = routed(0);
    expect(pushed.points).toEqual([
      { x: 512, y: 192 },
      { x: 608, y: 192 },
      { x: 608, y: 0 },
      { x: 640, y: 0 },
    ]);
    expect([wallCrossings(pushed.points, pushed.region.walls), onWall(pushed.points, pushed.region.walls)]).toEqual([
      0,
      false,
    ]);
  });
});
