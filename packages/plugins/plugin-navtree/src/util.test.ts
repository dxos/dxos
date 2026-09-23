//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { arrayMove } from '@dxos/util';

import { NavTreeNode } from '#types';

import { getRearrangeIndex, resolveDropKind } from './util.ts';

const SPACE = 'space';

const node = (id: string, properties: Partial<NavTreeNode.NavTreeItemGraphNode['properties']> = {}) =>
  ({ id, type: 'test', data: null, properties }) as NavTreeNode.NavTreeItemGraphNode;

const item = node('item', { persistenceClass: 'echo', persistenceKey: SPACE });

const parent = (id: string, properties: Partial<NavTreeNode.NavTreeItemGraphNode['properties']> = {}) =>
  node(id, {
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([SPACE]),
    onMoveIn: () => {},
    onMoveOut: () => {},
    onLink: () => {},
    ...properties,
  });

describe('resolveDropKind', () => {
  test('moves between parents that share a move scope', ({ expect }) => {
    const sourceParent = parent('from', { moveScope: 'collection' });
    const destination = parent('to', { moveScope: 'collection' });
    expect(resolveDropKind({ source: item, sourceParent, destination })).toBe('move');
  });

  test('links when the drop crosses a move scope', ({ expect }) => {
    const destination = parent('to', { moveScope: 'collection' });
    expect(resolveDropKind({ source: item, sourceParent: parent('project'), destination })).toBe('link');
    expect(resolveDropKind({ source: item, sourceParent: destination, destination: parent('project') })).toBe('link');
  });

  test('rejects a drop back into its own parent', ({ expect }) => {
    const sourceParent = parent('from', { moveScope: 'collection' });
    expect(resolveDropKind({ source: item, sourceParent, destination: sourceParent })).toBe('reject');
  });

  test('rejects a drop from another space', ({ expect }) => {
    const destination = parent('to', { acceptPersistenceKey: new Set(['other']) });
    expect(resolveDropKind({ source: item, sourceParent: parent('from'), destination })).toBe('reject');
  });

  test('rejects a destination that accepts neither a move nor a link', ({ expect }) => {
    const destination = parent('to', { onMoveIn: undefined, onLink: undefined });
    expect(resolveDropKind({ source: item, sourceParent: parent('from'), destination })).toBe('reject');
  });
});

describe('getRearrangeIndex', () => {
  test('an item moving down lands before the insertion point', ({ expect }) => {
    const items = ['a', 'b', 'c'];
    arrayMove(items, 0, getRearrangeIndex(0, 2));
    expect(items).toEqual(['b', 'a', 'c']);
  });

  test('an item moving up lands at the insertion point', ({ expect }) => {
    const items = ['a', 'b', 'c'];
    arrayMove(items, 2, getRearrangeIndex(2, 1));
    expect(items).toEqual(['a', 'c', 'b']);
  });

  test('an item dropped beside itself stays put', ({ expect }) => {
    expect(getRearrangeIndex(1, 1)).toBe(1);
    expect(getRearrangeIndex(1, 2)).toBe(1);
  });
});
