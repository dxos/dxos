//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type HullNode, type Link, type Node, isHullNode, isInstanceNode } from '@dxos/scene';

import { type RenderList2D, type RenderLists2D } from '../model/index.ts';
import { fromRenderLists2D, toRenderLists2D } from '../viewport2d/index.ts';
import { moveNodes } from './edits.ts';
import { collapseHulls, expandHulls, groupHull } from './hull-group.ts';
import { HULL_STYLE } from './hull.ts';
import { createLink, createNode } from './shapes.ts';

const box = (id: string, x: number, y: number, parent?: string): Node => ({
  ...createNode({ type: 'rect', id, z: `b${id}`, center: { x, y }, size: { width: 100, height: 50 } }),
  ...(parent ? { parent } : {}),
});

const hull = (id: string, fields: Partial<HullNode> = {}): HullNode => ({
  type: 'hull',
  id,
  z: 'a1',
  center: { x: 0, y: 0 },
  size: { width: 10, height: 10 },
  shape: 'box',
  label: 'Storage',
  style: HULL_STYLE,
  ...fields,
});

const smart = (id: string, source: string, target: string): Link =>
  createLink({ type: 'smart', id, z: `c${id}`, source: { node: source }, target: { node: target } });

const listOf = (id: string, nodes: readonly Node[], links: readonly Link[] = []): RenderList2D => ({
  id,
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  links: Object.fromEntries(links.map((link) => [link.id, link])),
});

// A and B inside the hull H, X outside it; one link inside, one across the border.
const FLAT: RenderLists2D = {
  board: listOf(
    'board',
    [hull('h'), box('a', 0, 0, 'h'), box('b', 300, 100, 'h'), box('x', 800, 0)],
    [smart('ab', 'a', 'b'), smart('xa', 'x', 'a')],
  ),
};

describe('collapseHulls', () => {
  test('a hull is stored as a group: an Instance over its nodes, which move into the group about their centre', ({
    expect,
  }) => {
    const { board, 'h-parts': parts } = collapseHulls(FLAT);
    expect(Object.keys(board.nodes).sort()).toEqual(['h', 'x']);
    const instance = board.nodes.h;
    expect(isInstanceNode(instance) && [instance.composite, instance.fit, groupHull(instance)]).toEqual([
      'h-parts',
      'none',
      'box',
    ]);
    // The Instance stands over the box of its parts, which keep their places about its centre.
    expect([instance.center, instance.size]).toEqual([
      { x: 150, y: 50 },
      { width: 400, height: 150 },
    ]);
    expect([parts.kind, parts.anonymous, parts.name]).toEqual(['composite', true, 'Storage']);
    expect([parts.nodes.a.center, parts.nodes.b.center]).toEqual([
      { x: -150, y: -50 },
      { x: 150, y: 50 },
    ]);
    expect([parts.nodes.a.parent, parts.nodes.a.exposed, parts.nodes.b.exposed]).toEqual([undefined, true, undefined]);
    // The link inside goes with them; the one across the border ends at the group, on the port named by the part.
    expect(Object.keys(parts.links)).toEqual(['ab']);
    expect(Object.keys(board.links)).toEqual(['xa']);
    expect(board.links.xa.target).toEqual({ node: 'h', port: 'a' });
    // The hull's own look and name are the Instance's.
    expect([Reflect.get(instance, 'label'), instance.style]).toEqual(['Storage', HULL_STYLE]);
  });

  test('a hull with nothing inside it has no group, and a node naming a hull that has gone names nothing', ({
    expect,
  }) => {
    const lists = { board: listOf('board', [hull('empty'), box('a', 0, 0, 'gone')]) };
    const { board, ...rest } = collapseHulls(lists);
    expect(Object.keys(rest)).toEqual([]);
    expect([board.nodes.empty.type, board.nodes.a.parent]).toEqual(['hull', undefined]);
  });

  test('lists with no hull come back as they are', ({ expect }) => {
    const lists = { board: listOf('board', [box('a', 0, 0), box('b', 300, 0)], [smart('ab', 'a', 'b')]) };
    expect(collapseHulls(lists)).toBe(lists);
    expect(expandHulls(lists)).toBe(lists);
  });
});

describe('expandHulls', () => {
  test('the group is opened out where it stands: its nodes back in the scene, each naming the hull', ({ expect }) => {
    const { board, ...rest } = expandHulls(collapseHulls(FLAT));
    // The group's own list is not one the editor draws.
    expect(Object.keys(rest)).toEqual([]);
    const made = board.nodes.h;
    expect(isHullNode(made) && [made.shape, made.group, made.label, made.style]).toEqual([
      'box',
      'h-parts',
      'Storage',
      HULL_STYLE,
    ]);
    for (const id of ['a', 'b', 'x']) {
      expect(board.nodes[id]).toEqual(FLAT.board.nodes[id]);
    }
    expect(board.links).toEqual(FLAT.board.links);
  });

  test('closing what was opened gives the same group, so an unchanged hull writes nothing', ({ expect }) => {
    const stored = collapseHulls(FLAT);
    expect(collapseHulls(expandHulls(stored))).toEqual(stored);
  });

  test('a hull survives the document: written as a group and read back opened out', ({ expect }) => {
    const document = fromRenderLists2D(Object.values(collapseHulls(FLAT)), { root: 'board' });
    // Stored, the board holds the Instance and the outside shape only; the nodes inside are the group's parts.
    const stored = document.layouts.find((layout) => layout.id === 'board');
    expect(Object.keys(stored?.elements ?? {}).sort()).toEqual(['h', 'x', 'xa']);
    expect(Object.keys(document.layouts.find((layout) => layout.id === 'h-parts')?.elements ?? {}).sort()).toEqual([
      'a',
      'ab',
      'b',
    ]);
    const { lists } = toRenderLists2D(document);
    const { board } = expandHulls(Object.fromEntries(lists.map((list) => [list.id, list])));
    expect(Object.keys(board.nodes).sort()).toEqual(['a', 'b', 'h', 'x']);
    expect([board.nodes.a.center, board.nodes.a.parent, board.nodes.b.center]).toEqual([
      { x: 0, y: 0 },
      'h',
      { x: 300, y: 100 },
    ]);
    expect(board.links.xa.target).toEqual({ node: 'a' });
    expect(board.links.ab.source).toEqual({ node: 'a' });
  });

  test('a group is left closed where opening it would not be the same drawing', ({ expect }) => {
    const stored = collapseHulls(FLAT);
    // Placed twice, its parts would stand in two places under one id each.
    const twice = {
      ...stored,
      board: {
        ...stored.board,
        nodes: { ...stored.board.nodes, copy: { ...stored.board.nodes.h, id: 'copy' } },
      },
    };
    expect(expandHulls(twice)).toBe(twice);
    // A part sharing an id with a node of the scene could not stand beside it.
    const clash = { ...stored, board: { ...stored.board, nodes: { ...stored.board.nodes, a: box('a', 900, 900) } } };
    expect(expandHulls(clash)).toBe(clash);
  });
});

describe('a hull in the scene the editor draws', () => {
  test('moving a hull moves the nodes inside it, and so the group', ({ expect }) => {
    const moved = { board: moveNodes(['h'], { x: 50, y: 20 })(FLAT.board) };
    expect([moved.board.nodes.a.center, moved.board.nodes.b.center, moved.board.nodes.x.center]).toEqual([
      { x: 50, y: 20 },
      { x: 350, y: 120 },
      { x: 800, y: 0 },
    ]);
    const { board, 'h-parts': parts } = collapseHulls(moved);
    expect(board.nodes.h.center).toEqual({ x: 200, y: 70 });
    // The parts have not moved within the group: only the Instance has.
    expect(parts).toEqual(collapseHulls(FLAT)['h-parts']);
  });

  test('a node moved inside a hull moves the part, and the Instance grows round it', ({ expect }) => {
    const moved = { board: moveNodes(['b'], { x: 200, y: 0 })(FLAT.board) };
    const { board } = collapseHulls(moved);
    expect([board.nodes.h.center, board.nodes.h.size]).toEqual([
      { x: 250, y: 50 },
      { width: 600, height: 150 },
    ]);
  });
});
