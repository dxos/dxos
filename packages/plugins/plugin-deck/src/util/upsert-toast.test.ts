//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutOperation } from '@dxos/app-toolkit';

import { upsertToast } from './upsert-toast';

const makeToast = (id: string, title?: string): LayoutOperation.Toast => ({ id, title });

describe('upsertToast', () => {
  test('appends a toast with an unseen id', ({ expect }) => {
    const toasts = upsertToast([makeToast('a')], makeToast('b'));
    expect(toasts.map(({ id }) => id)).to.deep.equal(['a', 'b']);
  });

  test('replaces a toast sharing an id rather than stacking a duplicate', ({ expect }) => {
    const toasts = upsertToast([makeToast('a', 'first'), makeToast('b')], makeToast('a', 'second'));
    expect(toasts.map(({ id }) => id)).to.deep.equal(['a', 'b']);
    expect(toasts[0].title).to.equal('second');
  });

  test('replaces in place so a refreshed toast keeps its position', ({ expect }) => {
    const toasts = upsertToast([makeToast('a'), makeToast('b'), makeToast('c')], makeToast('b', 'updated'));
    expect(toasts.map(({ id }) => id)).to.deep.equal(['a', 'b', 'c']);
  });

  test('does not mutate the input', ({ expect }) => {
    const original = [makeToast('a')];
    upsertToast(original, makeToast('a', 'replaced'));
    expect(original[0].title).to.equal(undefined);
  });
});
