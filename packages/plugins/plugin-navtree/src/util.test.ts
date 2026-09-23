//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { NavTreeNode } from '#types';

import { resolveDropOperation } from './util.ts';

const SPACE = 'space';

const node = (id: string, properties: Partial<NavTreeNode.NavTreeItemGraphNode['properties']> = {}) =>
  ({ id, type: 'test', data: null, properties }) as NavTreeNode.NavTreeItemGraphNode;

const item = node('item', { persistenceClass: 'echo', persistenceKey: SPACE });

const parent = (id: string, properties: Partial<NavTreeNode.NavTreeItemGraphNode['properties']> = {}) =>
  node(id, {
    acceptPersistenceClass: new Set(['echo']),
    acceptPersistenceKey: new Set([SPACE]),
    onTransferStart: () => {},
    onLink: () => {},
    ...properties,
  });

describe('resolveDropOperation', () => {
  test('moves between parents that share a transfer scope', ({ expect }) => {
    const sourceParent = parent('from', { transferScope: 'collection' });
    const destination = parent('to', { transferScope: 'collection' });
    expect(resolveDropOperation({ source: item, sourceParent, destination })).toBe('transfer');
  });

  test('links when the drop crosses a transfer scope', ({ expect }) => {
    const destination = parent('to', { transferScope: 'collection' });
    expect(resolveDropOperation({ source: item, sourceParent: parent('project'), destination })).toBe('link');
    expect(resolveDropOperation({ source: item, sourceParent: destination, destination: parent('project') })).toBe(
      'link',
    );
  });

  test('rejects a drop back into its own parent', ({ expect }) => {
    const sourceParent = parent('from', { transferScope: 'collection' });
    expect(resolveDropOperation({ source: item, sourceParent, destination: sourceParent })).toBe('reject');
  });

  test('rejects a drop from another space', ({ expect }) => {
    const destination = parent('to', { acceptPersistenceKey: new Set(['other']) });
    expect(resolveDropOperation({ source: item, sourceParent: parent('from'), destination })).toBe('reject');
  });

  test('rejects a destination that accepts neither a move nor a link', ({ expect }) => {
    const destination = parent('to', { onTransferStart: undefined, onLink: undefined });
    expect(resolveDropOperation({ source: item, sourceParent: parent('from'), destination })).toBe('reject');
  });
});
