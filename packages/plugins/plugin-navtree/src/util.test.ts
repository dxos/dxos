//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { NavTreeNode } from '#types';

import { resolveDropKind } from './util.ts';

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
