//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { type NodeBase } from '@dxos/scene';

import { type RenderList2D, orphanViews, pruneOrphaned } from '../model/index.ts';
import { createDrawState } from './draw-state.ts';

const box = { z: 'a0', center: { x: 0, y: 0 }, size: { width: 256, height: 128 } };

const viewNode = (id: string, scene: string): NodeBase & { scene: string } => ({ id, type: 'view', scene, ...box });
const instance = (id: string, composite: string): NodeBase & { composite: string } => ({
  id,
  type: 'instance',
  composite,
  ...box,
});
const view = (id: string, nodes: NodeBase[] = [], extra: Partial<RenderList2D> = {}): RenderList2D => ({
  id,
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  links: {},
  ...extra,
});

/** A root opening `child`, which places the anonymous `group`; a stray View, a stray anonymous and a named Object. */
const drawing = (): RenderList2D[] => [
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

  test('the draw state drops orphans on load when it is given the root, and keeps everything without one', ({
    expect,
  }) => {
    const registry = Registry.make();
    expect(Object.keys(registry.get(createDrawState(drawing(), {}, { root: 'root' }).views)).sort()).toEqual([
      'child',
      'group',
      'named',
      'root',
    ]);
    expect(Object.keys(registry.get(createDrawState(drawing()).views))).toHaveLength(7);
  });
});
