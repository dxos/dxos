//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { applyStructuralEdit } from './fold-edit.ts';

type Doc = { list: string[] };

/** Applies a fold edit to `base` and a direct edit to a concurrent copy, then merges them. */
const foldBesideDirectEdit = (
  base: A.Doc<Doc>,
  fold: { previous: string[]; next: string[] },
  direct: (doc: Doc) => void,
): string[] => {
  const folded = A.change(A.clone(base, '0a'.repeat(16)), (doc) =>
    applyStructuralEdit(doc, ['list'], fold.previous, fold.next, [...base.list]),
  );
  const edited = A.change(A.clone(base, '0b'.repeat(16)), direct);
  return [...A.merge(folded, edited).list];
};

describe('applyStructuralEdit', () => {
  test('places the late change on the target where its elements are, not where the source had them', () => {
    // A concurrent fold put `y` before `x` in the target; the late change only appended `z`.
    const base = A.from<Doc>({ list: ['a', 'y', 'x'] }, '0c'.repeat(16));
    const result = foldBesideDirectEdit(base, { previous: ['a', 'x', 'y'], next: ['a', 'x', 'y', 'z'] }, (doc) => {
      doc.list.splice(1, 1);
    });
    // Only `z` is written, after `y` as in the source: `y` stays deleted and `x` is not rewritten.
    expect(result).to.deep.eq(['a', 'z', 'x']);
  });

  test('two inserts that fall back to one anchor keep their source order', () => {
    const base = A.from<Doc>({ list: ['a', 'b'] }, '0c'.repeat(16));
    const result = foldBesideDirectEdit(base, { previous: ['a', 'x', 'b'], next: ['a', 'p', 'x', 'q', 'b'] }, () => {});
    expect(result).to.deep.eq(['a', 'p', 'q', 'b']);
  });

  test('a front insert into a long list writes the insert alone', () => {
    const items = Array.from({ length: 600 }, (_, index) => `item ${index}`);
    const base = A.from<Doc>({ list: items }, '0c'.repeat(16));
    const result = foldBesideDirectEdit(base, { previous: items, next: ['first', ...items] }, (doc) => {
      A.updateText(doc, ['list', 599], 'edited');
    });
    expect(result).to.have.length(601);
    expect(result[0]).to.eq('first');
    expect(result[600]).to.eq('edited');
  });
});
