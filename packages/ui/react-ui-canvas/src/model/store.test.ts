//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { createMemoryStore } from './store.ts';
import { type NodeBase, isViewNode } from './types.ts';

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
