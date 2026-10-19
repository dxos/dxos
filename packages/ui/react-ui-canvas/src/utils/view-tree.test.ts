//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createNestedSimpleTree, createObjectsTree } from '../testing/index.ts';
import { buildViewTree } from './view-tree.ts';

const labels = (items: { label: string }[]) => items.map((item) => item.label);

describe('buildViewTree', () => {
  test('a view lists its nodes in drawing order, then its links; a frame is the view it opens', ({ expect }) => {
    const tree = createNestedSimpleTree();
    const view = buildViewTree(Object.fromEntries(tree.scenes.map((scene) => [scene.id, scene])), tree.root);
    expect(view.kind).toBe('view');
    const kinds = view.children.map((item) => item.kind);
    expect(kinds.slice(0, 3)).toEqual(['node', 'node', 'view']);
    expect(kinds.slice(3)).toEqual(['link', 'link']);
    const nested = view.children.find((item) => item.kind === 'view');
    expect(nested?.path).toEqual([tree.root, 'c']);
    expect(labels(nested?.children.filter((item) => item.kind === 'node') ?? [])).toEqual(['D', 'E']);
  });

  test('an instance shows its object read-only, under every placement, with ids unique per path', ({ expect }) => {
    const tree = createObjectsTree();
    const scenes = Object.fromEntries(tree.scenes.map((scene) => [scene.id, scene]));
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
});
