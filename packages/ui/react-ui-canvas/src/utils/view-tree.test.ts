//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createNestedSimpleTree, createObjectsTree } from '../testing/index.ts';
import {
  type ViewTreeItem,
  buildViewTree,
  canRestack,
  restackZ,
  rowView,
  selectRows,
  viewReorder,
} from './view-tree.ts';

const labels = (items: { label: string }[]) => items.map((item) => item.label);

describe('buildViewTree', () => {
  test('a view lists its nodes in drawing order, then its links; a frame is the view it opens', ({ expect }) => {
    const tree = createNestedSimpleTree();
    const view = buildViewTree(Object.fromEntries(tree.views.map((scene) => [scene.id, scene])), tree.root);
    expect(view.kind).toBe('view');
    const kinds = view.children.map((item) => item.kind);
    expect(kinds.slice(0, 3)).toEqual(['node', 'node', 'view']);
    expect(kinds.slice(3)).toEqual(['link', 'link']);
    const nested = view.children.find((item) => item.kind === 'view');
    expect(nested?.path).toEqual([tree.root, 'c']);
    expect(labels(nested?.children.filter((item) => item.kind === 'node') ?? [])).toEqual(['D', 'E']);
    // A link is named by its ends, a View by the name of the View it opens.
    expect(labels(view.children.filter((item) => item.kind === 'link'))).toEqual(['A -> B', 'B -> C']);
  });

  test('an instance shows its object read-only, under every placement, with ids unique per path', ({ expect }) => {
    const tree = createObjectsTree();
    const scenes = Object.fromEntries(tree.views.map((scene) => [scene.id, scene]));
    const view = buildViewTree(scenes, tree.root);
    const all = (items: ReturnType<typeof buildViewTree>[]): ReturnType<typeof buildViewTree>[] =>
      items.flatMap((item) => [item, ...all(item.children)]);
    const rows = all(view.children);
    const logos = rows.filter((item) => item.kind === 'instance' && item.label === 'Logo');
    // In the root, in the Section view, and inside the Card object.
    expect(logos).toHaveLength(3);
    expect(logos.every((item) => item.children.every((child) => child.readonly))).toBe(true);
    expect(new Set(rows.map((item) => item.id)).size).toBe(rows.length);
    // Badge is defined but placed nowhere, so it is no row of the views tree.
    expect(rows.some((item) => item.label === 'Badge')).toBe(false);
  });

  test('restackZ moves an element just before or after a sibling, nodes among nodes', ({ expect }) => {
    const tree = createNestedSimpleTree();
    const scene = tree.views.find((scene) => scene.id === tree.root);
    if (!scene) {
      throw new Error('fixture has no root scene');
    }
    const order = (z: Record<string, string>) =>
      Object.entries(z)
        .sort(([, left], [, right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([id]) => id);
    const zs = Object.fromEntries(Object.values(scene.nodes).map((node) => [node.id, node.z]));
    expect(order(zs)).toEqual(['a', 'b', 'c']);
    const before = restackZ(scene, 'c', 'a', 'before');
    expect(order({ ...zs, c: before ?? '' })).toEqual(['c', 'a', 'b']);
    const after = restackZ(scene, 'a', 'c', 'after');
    expect(order({ ...zs, a: after ?? '' })).toEqual(['b', 'c', 'a']);
    // A node is not restacked among links, nor against itself.
    expect(restackZ(scene, 'a', 'a', 'before')).toBeUndefined();
    expect(restackZ(scene, 'a', Object.keys(scene.links)[0], 'before')).toBeUndefined();
    // Nor when it is already there.
    expect(restackZ(scene, 'a', 'b', 'before')).toBeUndefined();
    expect(restackZ(scene, 'c', 'b', 'after')).toBeUndefined();
  });

  test('selectRows selects a row in its View; meta toggles and a range stays in one View', ({ expect }) => {
    const tree = createNestedSimpleTree();
    const views = buildViewTree(Object.fromEntries(tree.views.map((scene) => [scene.id, scene])), tree.root);
    const rows = new Map<string, ViewTreeItem>();
    const walk = (item: ViewTreeItem) => {
      rows.set(item.id, item);
      item.children.forEach(walk);
    };
    walk(views);
    const row = (id: string) => {
      const item = rows.get(id);
      if (!item) {
        throw new Error(`no row ${id}`);
      }
      return item;
    };
    const root = [tree.root];
    const place = { path: root };
    const selection = new Set(['a']);
    // The root View row selects everything in it, nodes and links; an element in a nested View opens that View.
    expect(selectRows({ item: views, selection, place })).toEqual({
      path: root,
      ids: views.children.flatMap((child) => (child.element ? [child.element] : [])),
    });
    expect(selectRows({ item: views, selection, place })?.ids).toContain('a');
    expect(selectRows({ item: row('c/d'), selection, place })).toEqual({ path: [tree.root, 'c'], ids: ['d'] });
    // A View row selects its frame in the parent View.
    expect(rowView(row('c'))).toEqual(root);
    expect(selectRows({ item: row('c'), selection, place })).toEqual({ path: root, ids: ['c'] });
    // Meta toggles within the open View, and starts over in another.
    expect(selectRows({ item: row('b'), meta: true, selection, place })?.ids).toEqual(['a', 'b']);
    expect(selectRows({ item: row('a'), meta: true, current: false, selection, place })?.ids).toEqual([]);
    expect(selectRows({ item: row('c/d'), meta: true, selection, place })?.ids).toEqual(['d']);
    // A range keeps the rows drawn in the clicked row's View.
    const range = [row('b'), row('c'), row('c/d'), row('c/e')];
    expect(selectRows({ item: row('c'), range, selection, place })?.ids).toEqual(['b', 'c']);
    expect(selectRows({ item: row('c'), range, meta: true, selection, place })?.ids).toEqual(['a', 'b', 'c']);
  });

  test("an object's contents select inside the object, opened in isolation", ({ expect }) => {
    const tree = createObjectsTree();
    const views = buildViewTree(Object.fromEntries(tree.views.map((scene) => [scene.id, scene])), tree.root);
    const all = (items: ViewTreeItem[]): ViewTreeItem[] => items.flatMap((item) => [item, ...all(item.children)]);
    const mark = all(views.children).find((item) => item.id === 'logo-1/mark');
    if (!mark?.object) {
      throw new Error('fixture has no logo mark');
    }
    const logo = mark.object.isolate;
    expect(mark.object).toEqual({ path: [logo], isolate: logo });
    expect(selectRows({ item: mark, selection: new Set(), place: { path: [tree.root] } })).toEqual({
      path: [logo],
      isolate: logo,
      ids: ['mark'],
    });
  });

  test('a drop restacks among siblings of one container, above or below', ({ expect }) => {
    const tree = createObjectsTree();
    const views = buildViewTree(Object.fromEntries(tree.views.map((scene) => [scene.id, scene])), tree.root);
    const rows = new Map<string, ViewTreeItem>();
    const walk = (item: ViewTreeItem) => {
      rows.set(item.id, item);
      item.children.forEach(walk);
    };
    walk(views);
    const row = (id: string) => {
      const item = rows.get(id) ?? [...rows.values()].find((item) => item.element === id);
      if (!item) {
        throw new Error(`no row ${id}`);
      }
      return item;
    };
    const root = tree.root;
    expect(canRestack(row('card-1'), row('title'))).toBe(true);
    // Siblings inside a nested View, or inside an Object's definition (shared by every Instance), restack there too.
    expect(canRestack(row('section/caption'), row('section/logo-2'))).toBe(true);
    expect(canRestack(row('logo-1/mark'), row('logo-1/word'))).toBe(true);
    // Across containers, or a node among links: no drop.
    expect(canRestack(row('card-1'), row('section/caption'))).toBe(false);
    expect(canRestack(row('card-1'), row('logo-1/mark'))).toBe(false);
    expect(canRestack(row('card-1'), [...rows.values()].filter((item) => item.kind === 'link')[0])).toBe(false);
    expect(viewReorder(row('card-1'), row('title'), 'reorder-above')).toEqual({
      container: root,
      element: 'card-1',
      target: 'title',
      position: 'before',
    });
    expect(viewReorder(row('card-1'), row('title'), 'reorder-below')?.position).toBe('after');
    expect(viewReorder(row('card-1'), row('title'), 'make-child')).toBeUndefined();
  });
});
