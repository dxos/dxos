//
// Copyright 2024 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, test } from 'vitest';

import { AttentionManager, expandAttendableId, getSegmentId, getParentId, isSeparatorPrefixed } from './attention';

describe('AttentionManager', () => {
  test('takes an initial attended id', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry, ['root/a/b']);

    expect(attention.getCurrent()).to.deep.equal(['root/a/b']);
    expect(attention.get('root')).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });
    expect(attention.get('root/a')).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });
    expect(attention.get('root/a/b')).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
    expect(attention.get('unrelated')).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });
  });

  test('current returns last updated ids', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);
    expect(attention.getCurrent()).to.deep.equal([]);

    attention.update(['root/a/b/c']);
    expect(attention.getCurrent()).to.deep.equal(['root/a/b/c']);
  });

  test('keys returns all tracked qualified ids', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);
    expect(attention.keys()).to.deep.equal([]);

    attention.update(['root/a']);
    expect(attention.keys()).to.include('root');
    expect(attention.keys()).to.include('root/a');
  });

  test('get returns attention state for a given qualified id', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);
    expect(attention.get('root/a')).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });

    attention.update(['root/a']);
    expect(attention.get('root/a')).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
    expect(attention.get('root')).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });
  });

  test('clears previous attention on update', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);

    attention.update(['root/a/b']);
    expect(attention.get('root/a/b')).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
    expect(attention.get('root/a')).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });

    attention.update(['root/x/y']);
    expect(attention.get('root/a/b')).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });
    expect(attention.get('root/a')).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });
    expect(attention.get('root/x/y')).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
    expect(attention.get('root/x')).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });
    expect(attention.get('root')).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });
  });

  test('separator-prefixed segment marks parent with isRelated and isAncestor', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);

    attention.update(['root/space/obj/~settings']);
    expect(attention.get('root/space/obj/~settings')).to.deep.equal({
      hasAttention: true,
      isAncestor: false,
      isRelated: false,
    });
    expect(attention.get('root/space/obj')).to.deep.equal({
      hasAttention: false,
      isAncestor: true,
      isRelated: true,
    });
    expect(attention.get('root/space')).to.deep.equal({
      hasAttention: false,
      isAncestor: true,
      isRelated: false,
    });
    expect(attention.get('root')).to.deep.equal({
      hasAttention: false,
      isAncestor: true,
      isRelated: false,
    });
  });

  test('switching from separator-prefixed to non-prefixed clears parent isRelated', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);

    attention.update(['root/space/obj/~settings']);
    expect(attention.get('root/space/obj')).to.deep.equal({
      hasAttention: false,
      isAncestor: true,
      isRelated: true,
    });

    attention.update(['root/space/obj']);
    expect(attention.get('root/space/obj')).to.deep.equal({
      hasAttention: true,
      isAncestor: false,
      isRelated: false,
    });
    expect(attention.get('root/space/obj/~settings')).to.deep.equal({
      hasAttention: false,
      isAncestor: false,
      isRelated: false,
    });
  });

  test('keys sharing the same segment id are marked isRelated', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);

    // Pre-register the alternate path so the manager knows about it.
    attention.get('root/z/y/c');

    attention.update(['root/a/b/c']);
    expect(attention.get('root/a/b/c')).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
    expect(attention.get('root/z/y/c')).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: true });
  });

  test('related keys are cleared when attention moves to a different segment id', ({ expect }) => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);

    attention.get('root/z/y/c');
    attention.update(['root/a/b/c']);
    expect(attention.get('root/z/y/c')).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: true });

    attention.update(['root/x/y/d']);
    expect(attention.get('root/z/y/c')).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });
    expect(attention.get('root/a/b/c')).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });
  });
});

describe('expandAttendableId', () => {
  test('produces progressive prefixes', ({ expect }) => {
    expect(expandAttendableId('root/space/types/doc')).to.deep.equal([
      'root',
      'root/space',
      'root/space/types',
      'root/space/types/doc',
    ]);
  });

  test('single segment returns itself', ({ expect }) => {
    expect(expandAttendableId('root')).to.deep.equal(['root']);
  });
});

describe('isSeparatorPrefixed', () => {
  test('detects separator prefix on last segment', ({ expect }) => {
    expect(isSeparatorPrefixed('root/space/obj/~settings')).toBe(true);
    expect(isSeparatorPrefixed('root/space/obj')).toBe(false);
    expect(isSeparatorPrefixed('~standalone')).toBe(true);
  });
});

describe('getParentId', () => {
  test('returns parent qualified id', ({ expect }) => {
    expect(getParentId('root/space/obj/~settings')).toBe('root/space/obj');
    expect(getParentId('root/space')).toBe('root');
    expect(getParentId('root')).toBeUndefined();
  });
});

describe('getSegmentId', () => {
  test('returns the last path segment', ({ expect }) => {
    expect(getSegmentId('root/space/obj')).toBe('obj');
    expect(getSegmentId('root')).toBe('root');
    expect(getSegmentId('root/a/~settings')).toBe('~settings');
  });
});
