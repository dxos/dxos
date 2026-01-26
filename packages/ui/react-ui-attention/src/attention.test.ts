//
// Copyright 2024 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, test } from 'vitest';

import { AttentionManager } from './attention';

describe('AttentionManager', () => {
  test('takes an initial attendable', () => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry, ['a', 'b', 'c']);
    expect(attention.getCurrent()).to.deep.equal(['a', 'b', 'c']);
    expect(attention.keys()).to.deep.equal([['a'], ['b', 'c'], ['c'], ['a', 'b', 'c']]);
    expect(attention.get(['a'])).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: true });
    expect(attention.get(['b', 'c'])).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });
    expect(attention.get(['c'])).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });
    expect(attention.get(['a', 'b', 'c'])).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
    expect(attention.get(['b'])).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });
  });

  test('current returns last updated key', () => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);
    expect(attention.getCurrent()).to.deep.equal([]);

    attention.update(['a', 'b', 'c']);
    expect(attention.getCurrent()).to.deep.equal(['a', 'b', 'c']);
  });

  test('keys returns all stored attendables', () => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);
    expect(attention.keys()).to.deep.equal([]);

    attention.update(['a']);
    expect(attention.keys()).to.deep.equal([['a']]);

    attention.update(['a', 'b']);
    expect(attention.keys()).to.deep.equal([['a'], ['b'], ['a', 'b']]);
  });

  test('get returns attention object for a given key', () => {
    const registry = Registry.make();
    const attention = new AttentionManager(registry);
    expect(attention.get(['a'])).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });

    attention.update(['a']);
    expect(attention.get(['a'])).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
  });
});
