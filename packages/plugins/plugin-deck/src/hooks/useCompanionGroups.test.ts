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

  test('falls back to nothing when the attended node has no companions at all', () => {
    expect(resolveActiveCompanion('node/settings', groups(['global', ['search']]))).toBeUndefined();
  });

  test('a missing root-level companion does not borrow a node one', () => {
    // A root companion applies everywhere, so its absence means it is gone rather than out of scope.
    expect(resolveActiveCompanion('trace', available)).toBeUndefined();
  });

  test('no preference selects nothing, leaving the sidebar to collapse', () => {
    expect(resolveActiveCompanion(undefined, available)).toBeUndefined();
  });
});
