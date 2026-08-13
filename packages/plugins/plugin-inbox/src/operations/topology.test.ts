//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Node, sort } from './topology';

const ids = (nodes: readonly Node[]) => nodes.map((node) => node.id);

describe('processor topology', () => {
  test('keeps contribution order when nothing declares a dependency', () => {
    // Ties resolve to contribution order rather than anything derived: a topology that reshuffles
    // between runs would make cursor behaviour irreproducible.
    const { ordered, excluded } = sort([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(ids(ordered)).toEqual(['a', 'b', 'c']);
    expect(excluded).toEqual([]);
  });

  test('runs a processor after the ones it declares', () => {
    const { ordered } = sort([{ id: 'classify', after: ['contacts'] }, { id: 'contacts' }]);
    expect(ids(ordered)).toEqual(['contacts', 'classify']);
  });

  test('resolves a chain declared in reverse', () => {
    const { ordered } = sort([
      { id: 'analyze', after: ['summarize'] },
      { id: 'summarize', after: ['classify'] },
      { id: 'classify', after: ['contacts'] },
      { id: 'contacts' },
    ]);
    expect(ids(ordered)).toEqual(['contacts', 'classify', 'summarize', 'analyze']);
  });

  test('orders against several dependencies at once', () => {
    const { ordered } = sort([
      { id: 'summarize', after: ['contacts', 'classify'] },
      { id: 'contacts' },
      { id: 'classify', after: ['contacts'] },
    ]);
    expect(ids(ordered)).toEqual(['contacts', 'classify', 'summarize']);
  });

  test('ignores a dependency on a processor no plugin contributed', () => {
    // The normal case for an optional dependency — naming a processor whose plugin is not installed
    // must degrade to "unconstrained", not exclude the node.
    const { ordered, excluded } = sort([{ id: 'analyze', after: ['notInstalled'] }]);
    expect(ids(ordered)).toEqual(['analyze']);
    expect(excluded).toEqual([]);
  });

  test('ignores a self-dependency rather than deadlocking on it', () => {
    const { ordered, excluded } = sort([{ id: 'a', after: ['a'] }]);
    expect(ids(ordered)).toEqual(['a']);
    expect(excluded).toEqual([]);
  });

  test('keeps the first of a duplicated id and excludes the rest', () => {
    // Ids are cursor tags: two processors sharing one would share a watermark and silently skip each
    // other's work, which is the exact failure the tags exist to prevent.
    const { ordered, excluded } = sort([{ id: 'a' }, { id: 'b' }, { id: 'a' }]);
    expect(ids(ordered)).toEqual(['a', 'b']);
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reason).toContain("duplicate processor id 'a'");
  });

  test('excludes only the members of a cycle, running everything else', () => {
    const { ordered, excluded } = sort([
      { id: 'contacts' },
      { id: 'x', after: ['y'] },
      { id: 'y', after: ['x'] },
      { id: 'classify', after: ['contacts'] },
    ]);
    expect(ids(ordered)).toEqual(['contacts', 'classify']);
    expect(excluded.map((entry) => entry.node.id).sort()).toEqual(['x', 'y']);
    // Every member names the whole cycle: it has no single culprit, so reporting one tells nobody
    // which contribution to change.
    for (const entry of excluded) {
      expect(entry.reason).toBe('dependency cycle among [x, y]');
    }
  });

  test('excludes a processor that depends on a cycle', () => {
    const { ordered, excluded } = sort([
      { id: 'x', after: ['y'] },
      { id: 'y', after: ['x'] },
      { id: 'downstream', after: ['x'] },
    ]);
    expect(ordered).toEqual([]);
    expect(excluded.map((entry) => entry.node.id).sort()).toEqual(['downstream', 'x', 'y']);
  });

  test('handles an empty contribution set', () => {
    expect(sort([])).toEqual({ ordered: [], excluded: [] });
  });
});
