//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DocState } from './doc.ts';

describe('DocState', () => {
  test('heads track the frontier', ({ expect }) => {
    const doc = new DocState('doc');
    doc.change('a1');
    doc.change('a2');
    expect(doc.heads).toEqual(['a2']);
  });

  test('concurrent branches merge to multiple heads', ({ expect }) => {
    const left = new DocState('doc');
    left.change('base');
    const right = left.clone();
    left.change('left');
    right.change('right');
    left.apply(right.missingFor(left.heads));
    expect(left.heads).toEqual(['left', 'right']);
    left.change('merge');
    expect(left.heads).toEqual(['merge']);
  });

  test('missingFor returns only what the remote lacks, in causal order', ({ expect }) => {
    const doc = new DocState('doc');
    ['c1', 'c2', 'c3', 'c4'].forEach((hash) => doc.change(hash));
    expect(doc.missingFor(['c2']).map((change) => change.hash)).toEqual(['c3', 'c4']);
    expect(doc.missingFor([]).map((change) => change.hash)).toEqual(['c1', 'c2', 'c3', 'c4']);
    // Unknown remote heads are ignored: we cannot tell what they imply.
    expect(doc.missingFor(['unknown']).map((change) => change.hash)).toHaveLength(4);
  });

  test('out-of-order changes are buffered until their deps arrive', ({ expect }) => {
    const source = new DocState('doc');
    ['c1', 'c2', 'c3'].forEach((hash) => source.change(hash));
    const [first, second, third] = source.missingFor([]);
    const target = new DocState('doc');
    expect(target.apply([third, second])).toEqual({ applied: 0, duplicate: 0 });
    expect(target.pendingCount).toBe(2);
    expect(target.apply([first, second])).toEqual({ applied: 3, duplicate: 1 });
    expect(target.heads).toEqual(['c3']);
  });
});
