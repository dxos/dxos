//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import type { SyncRecord } from '@dxos/echo-sync-worker/protocol';

import { merge3, onBase, same } from './merge.ts';

const make = (
  props: Record<string, unknown>,
  refs: SyncRecord['refs'] = {},
  extra: Partial<SyncRecord> = {},
): SyncRecord => ({ key: 'k', typename: 't', props, refs, ...extra });

describe('same', () => {
  test('ignores key order and seq', () => {
    expect(same(make({ a: 1, b: 2 }, {}, { seq: 3 }), make({ b: 2, a: 1 }))).toBe(true);
    expect(same(make({ a: 1 }), make({ a: 2 }))).toBe(false);
    expect(same(make({}), undefined)).toBe(false);
  });
});

describe('merge3', () => {
  test('edits to different fields both survive', () => {
    const base = make({ name: 'n', email: 'e' });
    const merged = merge3(base, make({ name: 'mine', email: 'e' }), make({ name: 'n', email: 'theirs' }));
    expect(merged.props).toEqual({ name: 'mine', email: 'theirs' });
  });

  test('an edit to the same field keeps the local one', () => {
    const base = make({ name: 'n' });
    expect(merge3(base, make({ name: 'mine' }), make({ name: 'theirs' })).props).toEqual({ name: 'mine' });
  });

  test('a field cleared locally stays cleared; one cleared remotely is cleared', () => {
    const base = make({ name: 'n', email: 'e' });
    expect(merge3(base, make({ name: 'n' }), make({ name: 'n', email: 'e' })).props).toEqual({ name: 'n' });
    expect(merge3(base, make({ name: 'mine', email: 'e' }), make({ name: 'n' })).props).toEqual({ name: 'mine' });
  });

  test('edges merge like fields', () => {
    const base = make({}, { employer: 'x', friends: ['a'] });
    const merged = merge3(
      base,
      make({}, { employer: 'y', friends: ['a'] }),
      make({}, { employer: 'x', friends: ['a', 'b'] }),
    );
    expect(merged.refs).toEqual({ employer: 'y', friends: ['a', 'b'] });
  });

  test('a delete on either side wins', () => {
    const base = make({ name: 'n' });
    expect(merge3(base, make({ name: 'mine' }), make({}, {}, { deleted: true })).deleted).toBe(true);
    expect(merge3(base, make({}, {}, { deleted: true }), make({ name: 'theirs' })).deleted).toBe(true);
  });

  test('with no base, local fields win and remote fills the rest', () => {
    expect(merge3(undefined, make({ name: 'mine' }), make({ name: 'theirs', email: 'e' })).props).toEqual({
      name: 'mine',
      email: 'e',
    });
  });
});

describe('onBase', () => {
  test('an edge missing locally keeps the base value; a cleared one stays null', () => {
    const base = make({}, { employer: 'x', manager: 'm' });
    expect(onBase(make({}, { manager: null }), base).refs).toEqual({ employer: 'x', manager: null });
  });
});
