//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { advance } from './useArticleKeyboardNavigation';

describe('advance', () => {
  const ids = ['a', 'b', 'c', 'd'];

  test('returns undefined for an empty list', ({ expect }) => {
    expect(advance({ ids: [], currentId: undefined, delta: 1 })).to.equal(undefined);
    expect(advance({ ids: [], currentId: 'x', delta: -1 })).to.equal(undefined);
  });

  test('with no current selection, delta=+1 enters at the first item', ({ expect }) => {
    expect(advance({ ids, currentId: undefined, delta: 1 })).to.equal('a');
  });

  test('with no current selection, delta=-1 enters at the last item', ({ expect }) => {
    expect(advance({ ids, currentId: undefined, delta: -1 })).to.equal('d');
  });

  test('advances forward from the middle of the list', ({ expect }) => {
    expect(advance({ ids, currentId: 'b', delta: 1 })).to.equal('c');
  });

  test('advances backward from the middle of the list', ({ expect }) => {
    expect(advance({ ids, currentId: 'c', delta: -1 })).to.equal('b');
  });

  test('clamps at the last item when pressing next', ({ expect }) => {
    expect(advance({ ids, currentId: 'd', delta: 1 })).to.equal('d');
  });

  test('clamps at the first item when pressing previous', ({ expect }) => {
    expect(advance({ ids, currentId: 'a', delta: -1 })).to.equal('a');
  });

  test('treats an unknown currentId like no selection', ({ expect }) => {
    expect(advance({ ids, currentId: 'unknown', delta: 1 })).to.equal('a');
    expect(advance({ ids, currentId: 'unknown', delta: -1 })).to.equal('d');
  });

  test('single-item list clamps both directions to that item', ({ expect }) => {
    expect(advance({ ids: ['only'], currentId: 'only', delta: 1 })).to.equal('only');
    expect(advance({ ids: ['only'], currentId: 'only', delta: -1 })).to.equal('only');
  });
});
