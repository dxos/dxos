//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { AttentionManager } from './attention';

describe('AttentionManager', () => {
  test('takes an initial attendable', () => {
    const attention = new AttentionManager(['a', 'b', 'c']);
    expect(attention.current).to.deep.equal(['a', 'b', 'c']);
    expect(attention.keys()).to.deep.equal([['a'], ['b', 'c'], ['c'], ['a', 'b', 'c']]);
    expect(attention.get(['a'])).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: true });
    expect(attention.get(['b', 'c'])).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });
    expect(attention.get(['c'])).to.deep.equal({ hasAttention: false, isAncestor: true, isRelated: false });
    expect(attention.get(['a', 'b', 'c'])).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
    expect(attention.get(['b'])).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });
  });

  test('current returns last updated key', () => {
    const attention = new AttentionManager();
    expect(attention.current).to.deep.equal([]);

    attention.update(['a', 'b', 'c']);
    expect(attention.current).to.deep.equal(['a', 'b', 'c']);
  });

  test('keys returns all stored attendables', () => {
    const attention = new AttentionManager();
    expect(attention.keys()).to.deep.equal([]);

    attention.update(['a']);
    expect(attention.keys()).to.deep.equal([['a']]);

    attention.update(['a', 'b']);
    expect(attention.keys()).to.deep.equal([['a'], ['b'], ['a', 'b']]);
  });

  test('get returns attention object for a given key', () => {
    const attention = new AttentionManager();
    expect(attention.get(['a'])).to.deep.equal({ hasAttention: false, isAncestor: false, isRelated: false });

    attention.update(['a']);
    expect(attention.get(['a'])).to.deep.equal({ hasAttention: true, isAncestor: false, isRelated: false });
  });
});
