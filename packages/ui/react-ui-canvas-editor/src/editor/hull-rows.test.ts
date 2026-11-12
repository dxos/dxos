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
  constrain2D,
  createLink,
  drawnLists2D,
  drawnWrites,
  enclose,
  fromRenderLists2D,
  moveWrites,
  viewMove,
} from '@dxos/react-ui-canvas';
import { type HullNode, type Link, type RectNode, type Scene, applyIntent, findLayout } from '@dxos/scene';

import { DEFAULT_LATTICE, type DrawingValues, drawingSaves, latticeValues } from './drawing-form.ts';
import { layoutTree, selectedElement } from './scene-rows.ts';

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

  test('a hull made round shapes keeps the links that cross its border', ({ expect }) => {
    // The same board with no hull yet: A, B and X stand in the scene, X linked to A and A to B.
    const flat: RenderList2D = {
      id: 'board',
      nodes: Object.fromEntries([box('a', 0), box('b', 200), box('x', 1000)].map((node) => [node.id, node])),
      links: { xa: smart('xa', 'x', 'a'), ab: smart('ab', 'a', 'b') },
    };
    const stored = fromRenderLists2D([flat], { root: 'board' });
    const drawn = Object.fromEntries(drawnLists2D(stored).lists.map((list) => [list.id, list]));
    const enclosed = enclose(drawn.board, ['a', 'b'], 'g');
    const next = enclosed ? written(stored, drawnWrites(stored, drawn, { ...drawn, board: enclosed })) : stored;
    // Stored, the link from outside ends at the group; the one between the two shapes is the group's own.
    const board = next.layouts.find((layout) => layout.id === 'board');
    expect(Object.keys(board?.elements ?? {}).sort()).toEqual(['g', 'x', 'xa']);
    expect(board?.elements.xa.target).toEqual({ node: 'g', port: 'a' });
    expect(Object.keys(next.layouts.find((layout) => layout.id === 'g-parts')?.elements ?? {}).sort()).toEqual([
      'a',
      'ab',
      'b',
    ]);
    // Drawn, both links are there, each ending at the shape it was drawn to.
    const shown = drawnLists2D(next).lists.find((list) => list.id === 'board');
    expect([shown?.links.xa?.target, shown?.links.ab?.source]).toEqual([{ node: 'a' }, { node: 'a' }]);
  });

  test('a hull, a link and a row already in the hull are not moved into one', ({ expect }) => {
    const tree = layoutTree(DOCUMENT);
    expect(viewMove(rowOf(tree, 'h'), rowOf(tree, 'g'), 'make-child')).toBeUndefined();
    expect(viewMove(rowOf(tree, 'xa'), rowOf(tree, 'g'), 'make-child')).toBeUndefined();
    expect(viewMove(rowOf(tree, 'a'), rowOf(tree, 'g'), 'make-child')).toBeUndefined();
    // A shape is not dropped into a shape.
    expect(viewMove(rowOf(tree, 'x'), rowOf(tree, 'a'), 'make-child')).toBeUndefined();
  });

  test("a lattice that changes size keeps every shape on its cells, a hull's shapes included", ({ expect }) => {
    // The board on a lattice of 100 by 50 cells, 100 and 50 apart: A, B, C and X stand at columns 0, 1, 3 and 5.
    const from = { width: 100, height: 50, gutterX: 100, gutterY: 50 };
    const stored: Scene.SceneDocument = {
      ...DOCUMENT,
      layouts: DOCUMENT.layouts.map((layout) =>
        layout.id === 'board' && layout.dim === '2d' ? { ...layout, lattice: from } : layout,
      ),
    };
    const current: DrawingValues = { grid: 50, lattice: true, ...latticeValues(from, 50) };
    const saves = drawingSaves(stored, 'board', current, {
      ...current,
      cell: { width: 4, height: 2 },
      gutter: { x: 2, y: 2 },
    });
    // The board's shapes travel with its lattice; each hull's are a write to its group.
    expect(saves.map((save) => save.layout).sort()).toEqual(['board', 'g-parts', 'h-parts']);
    const next = saves.reduce((document, save) => {
      const record = findLayout(document, save.layout);
      const intent = record && constrain2D(record, save.intent, { snap: true });
      expect(intent).toBeDefined();
      return intent ? written(document, [{ kind: 'layout', layout: save.layout, intent, created: false }]) : document;
    }, stored);
    const board = next.layouts.find((layout) => layout.id === 'board');
    expect(board?.dim === '2d' && board.lattice).toEqual({ width: 200, height: 100, gutterX: 100, gutterY: 100 });
    const drawn = drawnLists2D(next).lists.find((list) => list.id === 'board');
    expect(['a', 'b', 'c', 'x'].map((id) => [drawn?.nodes[id].center.x, drawn?.nodes[id].parent])).toEqual([
      [0, 'g'],
      [300, 'g'],
      [900, 'h'],
      [1500, undefined],
    ]);
    expect(['a', 'b', 'c', 'x'].map((id) => drawn?.nodes[id].size)).toEqual(
      Array.from({ length: 4 }, () => ({ width: 200, height: 100 })),
    );
    // The link from X still ends at A, inside its hull.
    expect(drawn?.links.xa?.target).toEqual({ node: 'a' });
  });

  test('a lattice turned on, off or left the same size moves nothing', ({ expect }) => {
    const off: DrawingValues = { grid: 50, lattice: false, ...latticeValues(DEFAULT_LATTICE, 50) };
    expect(drawingSaves(DOCUMENT, 'board', off, { ...off, lattice: true }).map((save) => save.layout)).toEqual([
      'board',
    ]);
    expect(drawingSaves(DOCUMENT, 'board', off, off)).toEqual([]);
  });

  test("a shape selected inside a hull is found in the hull's group, which is where its edits are written", ({
    expect,
  }) => {
    const board = findLayout(DOCUMENT, 'board');
    const pick = (id: string) => {
      const selected = board && selectedElement(DOCUMENT, board, id);
      return selected && [selected.element.id, selected.layout];
    };
    expect([pick('a'), pick('c'), pick('x'), pick('g'), pick('none')]).toEqual([
      ['a', 'g-parts'],
      ['c', 'h-parts'],
      ['x', 'board'],
      ['g', 'board'],
      undefined,
    ]);
  });
});
