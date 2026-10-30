//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { type NodeBase, isViewNode } from '@dxos/scene';

import { orphanViews, pruneOrphaned } from './orphans.ts';
import { createMemoryStore } from './store.ts';
import { type View } from './types.ts';

const box = { z: 'a0', center: { x: 0, y: 0 }, size: { width: 256, height: 128 } };

describe('memory store', () => {
  test('a node stored with the legacy `frame` type loads as a `view` node', ({ expect }) => {
    const stored: NodeBase & { scene: string } = { id: 'f', type: 'frame', scene: 'child', ...box };
    const store = createMemoryStore([
      { id: 'root', nodes: { f: stored }, links: {} },
      { id: 'child', nodes: {}, links: {} },
    ]);
    const node = Registry.make().get(store.view('root'))?.nodes.f;
    expect(node).toEqual({ ...stored, type: 'view' });
    expect(node && isViewNode(node)).toBe(true);
  });
});

const viewNode = (id: string, scene: string): NodeBase & { scene: string } => ({ id, type: 'view', scene, ...box });
const instance = (id: string, composite: string): NodeBase & { composite: string } => ({
  id,
  type: 'instance',
  composite,
  ...box,
});
const view = (id: string, nodes: NodeBase[] = [], extra: Partial<View> = {}): View => ({
  id,
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  links: {},
  ...extra,
});

/** A root opening `child`, which places the anonymous `group`; a stray View, a stray anonymous and a named Object. */
const drawing = (): View[] => [
  view('root', [viewNode('c', 'child')]),
  view('child', [instance('i', 'group')]),
  view('group', [], { kind: 'composite', anonymous: true }),
  view('stray'),
  view('lost', [viewNode('d', 'stray-child')], { kind: 'composite', anonymous: true }),
  view('stray-child'),
  view('named', [], { kind: 'composite', name: 'Named' }),
];

describe('orphans', () => {
  test('Views and anonymous Objects nothing reaches from the root are orphans; named Objects are kept', ({
    expect,
  }) => {
    const views = Object.fromEntries(drawing().map((entry) => [entry.id, entry]));
    expect([...orphanViews(views, ['root'])].sort()).toEqual(['lost', 'stray', 'stray-child']);
  });

  test('an edit prunes only the records it orphaned', ({ expect }) => {
    const before = Object.fromEntries(drawing().map((entry) => [entry.id, entry]));
    const after = { ...before, root: view('root') };
    expect(Object.keys(pruneOrphaned(before, after, ['root'])).sort()).toEqual([
      'lost',
      'named',
      'root',
      'stray',
      'stray-child',
    ]);
    expect(pruneOrphaned(before, before, ['root'])).toBe(before);
  });

  test('the memory store drops orphans on load when it is given the root, and keeps everything without one', ({
    expect,
  }) => {
    const registry = Registry.make();
    expect(Object.keys(registry.get(createMemoryStore(drawing(), {}, { root: 'root' }).views)).sort()).toEqual([
      'child',
      'group',
      'named',
      'root',
    ]);
    expect(Object.keys(registry.get(createMemoryStore(drawing()).views))).toHaveLength(7);
  });
});
