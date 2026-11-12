//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  HULL_STYLE,
  type LayoutWrite,
  type RenderList2D,
  type ViewTreeItem,
  canRestack,
  collapseHulls,
  createLink,
  drawnLists2D,
  fromRenderLists2D,
  moveWrites,
  viewMove,
} from '@dxos/react-ui-canvas';
import { type HullNode, type Link, type RectNode, type Scene, applyIntent } from '@dxos/scene';

import { layoutTree } from './scene-rows.ts';

const box = (id: string, x: number, parent?: string): RectNode => ({
  type: 'rect',
  id,
  z: `b${id}`,
  center: { x, y: 0 },
  size: { width: 100, height: 50 },
  label: id.toUpperCase(),
  ...(parent ? { parent } : {}),
});

const hull = (id: string): HullNode => ({
  type: 'hull',
  id,
  z: `a${id}`,
  center: { x: 0, y: 0 },
  size: { width: 10, height: 10 },
  label: id.toUpperCase(),
  style: HULL_STYLE,
});

const smart = (id: string, source: string, target: string): Link =>
  createLink({ type: 'smart', id, z: `c${id}`, source: { node: source }, target: { node: target } });

// Two hulls and a shape outside both: G holds A and B, H holds C; X stands alone, linked to A.
const BOARD: RenderList2D = {
  id: 'board',
  nodes: Object.fromEntries(
    [hull('g'), hull('h'), box('a', 0, 'g'), box('b', 200, 'g'), box('c', 600, 'h'), box('x', 1000)].map((node) => [
      node.id,
      node,
    ]),
  ),
  links: { xa: smart('xa', 'x', 'a') },
};

const DOCUMENT: Scene.SceneDocument = fromRenderLists2D(Object.values(collapseHulls({ board: BOARD })), {
  root: 'board',
});

/** The document after a host has taken `writes`, as a story's or the app's does. */
const written = (document: Scene.SceneDocument, writes: readonly LayoutWrite[]): Scene.SceneDocument =>
  writes.reduce((current, write): Scene.SceneDocument => {
    if (write.kind === 'define') {
      return {
        ...current,
        models: current.models.map((model) =>
          model.dim === '2d' ? { ...model, objects: { ...model.objects, [write.object.id]: write.object } } : model,
        ),
      };
    }
    const stored = current.layouts.find((layout) => layout.id === write.layout);
    const next = applyIntent(stored ?? { id: write.layout, dim: '2d', model: 'model', elements: {} }, write.intent);
    return {
      ...current,
      layouts: stored
        ? current.layouts.map((layout) => (layout.id === write.layout ? next : layout))
        : [...current.layouts, next],
    };
  }, document);

const rowOf = (tree: ViewTreeItem, element: string): ViewTreeItem => {
  const find = (item: ViewTreeItem): ViewTreeItem | undefined =>
    item.element === element ? item : item.children.flatMap((child) => find(child) ?? [])[0];
  const row = find(tree);
  if (!row) {
    throw new Error(`No row for ${element}.`);
  }
  return row;
};

/** Each hull's shapes as the tree nests them, and the shapes no hull holds. */
const nesting = (document: Scene.SceneDocument) => {
  const tree = layoutTree(document);
  const names = (rows: readonly ViewTreeItem[]) =>
    rows.flatMap((row) => (row.kind === 'link' || row.element === undefined ? [] : [row.element])).sort();
  return {
    root: names(tree.children.filter((row) => !row.hull)),
    ...Object.fromEntries(tree.children.filter((row) => row.hull).map((row) => [row.element, names(row.children)])),
  };
};

describe('hull rows', () => {
  test("a hull's shapes are rows under it, selected in the scene that places it rather than read-only", ({
    expect,
  }) => {
    const tree = layoutTree(DOCUMENT);
    expect(nesting(DOCUMENT)).toEqual({ root: ['x'], g: ['a', 'b'], h: ['c'] });
    const a = rowOf(tree, 'a');
    expect([a.readonly, a.object, a.path, a.group, a.scene, a.container]).toEqual([
      undefined,
      undefined,
      ['board'],
      'g',
      'board',
      'g-parts',
    ]);
    // Within one hull a drop beside a sibling is still a restack of the group's own drawing order.
    expect(canRestack(a, rowOf(tree, 'b'))).toBe(true);
    expect(viewMove(a, rowOf(tree, 'b'), 'reorder-below')).toBeUndefined();
  });

  test('a row dropped on a hull joins it, and the link on its shape goes with it', ({ expect }) => {
    const tree = layoutTree(DOCUMENT);
    const move = viewMove(rowOf(tree, 'x'), rowOf(tree, 'g'), 'make-child');
    expect(move).toEqual({ scene: 'board', element: 'x', group: 'g' });
    const next = move ? written(DOCUMENT, moveWrites(DOCUMENT, move)) : DOCUMENT;
    expect(nesting(next)).toEqual({ root: [], g: ['a', 'b', 'x'], h: ['c'] });
    // Both ends are inside the hull now, so the link is one of the group's own.
    expect(Object.keys(next.layouts.find((layout) => layout.id === 'g-parts')?.elements ?? {}).sort()).toEqual([
      'a',
      'b',
      'x',
      'xa',
    ]);
    // Nothing moved on the canvas: the shape is where it was, drawn in the scene.
    const drawn = drawnLists2D(next).lists.find((list) => list.id === 'board');
    expect([drawn?.nodes.x.center, drawn?.nodes.x.parent, drawn?.nodes.a.center]).toEqual([
      { x: 1000, y: 0 },
      'g',
      { x: 0, y: 0 },
    ]);
  });

  test('a row dropped beside a row of another hull moves to that hull; beside a row of none, out of its own', ({
    expect,
  }) => {
    const tree = layoutTree(DOCUMENT);
    const across = viewMove(rowOf(tree, 'b'), rowOf(tree, 'c'), 'reorder-above');
    expect(across).toEqual({ scene: 'board', element: 'b', group: 'h', target: 'c', position: 'before' });
    const moved = across ? written(DOCUMENT, moveWrites(DOCUMENT, across)) : DOCUMENT;
    expect(nesting(moved)).toEqual({ root: ['x'], g: ['a'], h: ['b', 'c'] });

    const out = viewMove(rowOf(tree, 'a'), rowOf(tree, 'x'), 'reorder-below');
    expect(out).toEqual({ scene: 'board', element: 'a', target: 'x', position: 'after' });
    const left = out ? written(DOCUMENT, moveWrites(DOCUMENT, out)) : DOCUMENT;
    expect(nesting(left)).toEqual({ root: ['a', 'x'], g: ['b'], h: ['c'] });
    // The link from X ends at the shape itself again, not at the group it left.
    expect(left.layouts.find((layout) => layout.id === 'board')?.elements.xa.target).toEqual({ node: 'a' });
  });

  test('a hull, a link and a row already in the hull are not moved into one', ({ expect }) => {
    const tree = layoutTree(DOCUMENT);
    expect(viewMove(rowOf(tree, 'h'), rowOf(tree, 'g'), 'make-child')).toBeUndefined();
    expect(viewMove(rowOf(tree, 'xa'), rowOf(tree, 'g'), 'make-child')).toBeUndefined();
    expect(viewMove(rowOf(tree, 'a'), rowOf(tree, 'g'), 'make-child')).toBeUndefined();
    // A shape is not dropped into a shape.
    expect(viewMove(rowOf(tree, 'x'), rowOf(tree, 'a'), 'make-child')).toBeUndefined();
  });
});
