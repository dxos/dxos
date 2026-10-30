//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { type NodeBase } from '@dxos/scene';

import { createMemoryStore, storeVersions, updateView } from './store.ts';
import { diffPaths, patchSource, readPath, recordChanges, sameValue, writePath } from './versioned.ts';

const box = (id: string, x = 0): NodeBase => ({
  id,
  type: 'rectangle',
  z: 'a0',
  center: { x, y: 0 },
  size: { width: 64, height: 64 },
});

const setup = () => {
  const registry = Registry.make();
  const store = createMemoryStore([{ id: 'root', nodes: { a: box('a'), b: box('b') }, links: {} }]);
  const versions = storeVersions(registry, store);
  const node = (id: string) => registry.get(store.views).root?.nodes[id];
  const move = (id: string, x: number) =>
    updateView(registry, store, 'root', (view) => ({
      ...view,
      nodes: { ...view.nodes, [id]: { ...view.nodes[id], center: { x, y: 0 } } },
    }));
  return { registry, store, versions, node, move };
};

describe('paths', () => {
  test('read and write copy only the records along the path, and undefined deletes', ({ expect }) => {
    const value = { a: { b: 1 }, c: { d: 2 } };
    const next = writePath(value, ['a', 'b'], 3);
    expect(next).toEqual({ a: { b: 3 }, c: { d: 2 } });
    expect(readPath(next, ['c'])).toBe(value.c);
    expect(writePath(value, ['a'], undefined)).toEqual({ c: { d: 2 } });
    expect(writePath(value, ['x', 'y'], 1)).toEqual({ ...value, x: { y: 1 } });
  });

  test('diff reports leaf paths, with arrays as leaves and added or removed records whole', ({ expect }) => {
    expect(diffPaths({ a: { x: 1, y: 2 }, l: [1] }, { a: { x: 1, y: 3 }, l: [1] })).toEqual([['a', 'y']]);
    expect(diffPaths({ l: [1] }, { l: [1, 2] })).toEqual([['l']]);
    expect(diffPaths({ n: {} }, { n: { a: { x: 1 } } })).toEqual([['n', 'a']]);
    expect(sameValue({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });
});

describe('memory store versions', () => {
  test('heads are snapshots: a change records the paths it wrote, and a patch moves them back and forth', ({
    expect,
  }) => {
    const { versions, node, move } = setup();
    const [change] = recordChanges([versions], () => move('a', 10));
    expect(change?.paths).toEqual([['root', 'nodes', 'a', 'center', 'x']]);
    if (!change) {
      return;
    }
    expect(patchSource(versions, { from: change.after, to: change.before, paths: change.paths })).toEqual({
      written: 1,
      unchanged: 0,
      skipped: 0,
    });
    expect(node('a')?.center.x).toBe(0);
    patchSource(versions, { from: change.before, to: change.after, paths: change.paths });
    expect(node('a')?.center.x).toBe(10);
  });

  test('a refused change records nothing', ({ expect }) => {
    const { versions } = setup();
    expect(recordChanges([versions], () => {})).toEqual([undefined]);
  });

  test('a path someone else changed since is skipped, and the rest is undone', ({ expect }) => {
    const { versions, node, move } = setup();
    const [change] = recordChanges([versions], () => {
      move('a', 10);
      move('b', 20);
    });
    move('b', 30);
    if (!change) {
      return;
    }
    expect(patchSource(versions, { from: change.after, to: change.before, paths: change.paths })).toEqual({
      written: 1,
      unchanged: 0,
      skipped: 1,
    });
    expect(node('a')?.center.x).toBe(0);
    expect(node('b')?.center.x).toBe(30);
  });

  test('undoing a delete puts the record back under its key', ({ expect }) => {
    const { registry, store, versions, node } = setup();
    const [change] = recordChanges([versions], () =>
      updateView(registry, store, 'root', ({ nodes: { a: _, ...nodes }, ...view }) => ({ ...view, nodes })),
    );
    expect(node('a')).toBeUndefined();
    if (!change) {
      return;
    }
    patchSource(versions, { from: change.after, to: change.before, paths: change.paths });
    expect(node('a')).toEqual(box('a'));
  });
});
