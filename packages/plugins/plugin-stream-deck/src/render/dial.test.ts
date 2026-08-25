//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { renderDial } from './dial';

describe('renderDial', () => {
  test('renders a determinate task with a bar', ({ expect }) => {
    expect(renderDial({ kind: 'progress', title: 'Syncing', ratio: 0.5, detail: '5/10' })).toEqual({
      title: 'Syncing',
      value: '5/10',
      bar: 0.5,
    });
  });

  test('renders a percentage when the task has no detail', ({ expect }) => {
    expect(renderDial({ kind: 'progress', title: 'Syncing', ratio: 0.25 })).toEqual({
      title: 'Syncing',
      value: '25%',
      bar: 0.25,
    });
  });

  test('renders an indeterminate task without a bar', ({ expect }) => {
    expect(renderDial({ kind: 'progress', title: 'Indexing' })).toEqual({
      title: 'Indexing',
      value: '…',
      bar: undefined,
    });
  });

  test('renders a stat', ({ expect }) => {
    expect(renderDial({ kind: 'stat', title: 'Objects', value: '128' })).toEqual({
      title: 'Objects',
      value: '128',
    });
  });
});
