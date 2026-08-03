//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import {
  type CompanionGroup,
  getNodeCompanionVariant,
  isNodeCompanionValue,
  makeNodeCompanionValue,
  resolveActiveCompanion,
  resolveNodeGroupAnchor,
} from './useCompanionGroups';

const entry = (value: string, scope: CompanionGroup['scope']) => ({
  value,
  variant: value.replace('node/', ''),
  scope,
  node: { id: value, type: 'companion', data: null, properties: {} } as any,
});

const groups = (...specs: [CompanionGroup['scope'], string[]][]): CompanionGroup[] =>
  specs.map(([scope, values]) => ({ scope, companions: values.map((value) => entry(value, scope)) }));

describe('companion values', () => {
  test('round-trips a node variant', () => {
    expect(getNodeCompanionVariant(makeNodeCompanionValue('comments'))).toEqual('comments');
  });

  test('a root-level value names no node variant', () => {
    expect(isNodeCompanionValue('search')).toBe(false);
    expect(getNodeCompanionVariant('search')).toBeUndefined();
    expect(getNodeCompanionVariant(undefined)).toBeUndefined();
  });
});

describe('resolveActiveCompanion', () => {
  const available = groups(['node', ['node/comments', 'node/settings']], ['global', ['search']]);

  test('shows the preference when the attended node offers it', () => {
    expect(resolveActiveCompanion('node/settings', available)).toEqual('node/settings');
    expect(resolveActiveCompanion('search', available)).toEqual('search');
  });

  test('falls back to the first node companion when the preferred variant is absent', () => {
    const withoutSettings = groups(['node', ['node/comments']], ['global', ['search']]);
    expect(resolveActiveCompanion('node/settings', withoutSettings)).toEqual('node/comments');
  });

  test('falls back past an empty node group to the next group', () => {
    expect(resolveActiveCompanion('node/settings', groups(['global', ['search']]))).toEqual('search');
  });

  test('falls back to the node group when the preferred root companion is gone', () => {
    expect(resolveActiveCompanion('trace', available)).toEqual('node/comments');
  });

  test('no preference shows the most specific companion available', () => {
    expect(resolveActiveCompanion(undefined, available)).toEqual('node/comments');
  });

  // Undefined only with nothing to show, which is the sole condition the sidebar collapses on.
  test('selects nothing when there are no companions at all', () => {
    expect(resolveActiveCompanion('node/settings', [])).toBeUndefined();
  });
});

describe('resolveNodeGroupAnchor', () => {
  test('an ordinary plank anchors the node group', () => {
    expect(resolveNodeGroupAnchor('root/docA')).toEqual('root/docA');
  });

  test('a companion anchors nothing — the sidebar shows workspace and global only', () => {
    // Not "the source's companions minus the one in view": a companion has no companions, so attending
    // a popped clone drops the node group entirely.
    expect(resolveNodeGroupAnchor('root/docA/~comments')).toBeUndefined();
  });

  test('no anchor at all yields no node group', () => {
    expect(resolveNodeGroupAnchor(undefined)).toBeUndefined();
  });
});
