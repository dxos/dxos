//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { numberEdit } from './number-edit.ts';

const idle = { text: '1' };

describe('numberEdit', () => {
  test('committing on change: each value typed commits', () => {
    expect(numberEdit(idle, { kind: 'type', text: '12', value: 12 }, { commitOn: 'change', committed: 1 })).toEqual({
      state: { text: '12' },
      commit: 12,
    });
  });

  test('committing on blur: typing holds the value until blur or Enter', () => {
    const typed = numberEdit(idle, { kind: 'type', text: '12', value: 12 }, { commitOn: 'blur', committed: 1 });
    expect(typed).toEqual({ state: { text: '12', pending: 12 } });
    expect(numberEdit(typed.state, { kind: 'commit' }, { commitOn: 'blur', committed: 1 })).toEqual({
      state: { text: '12' },
      commit: 12,
    });
  });

  test('Escape puts back the committed value and commits nothing', () => {
    const typed = numberEdit(idle, { kind: 'type', text: '12', value: 12 }, { commitOn: 'blur', committed: 1 }).state;
    expect(numberEdit(typed, { kind: 'revert' }, { commitOn: 'blur', committed: 1 })).toEqual({
      state: { text: '1' },
      restore: 1,
    });
  });

  test('a stepper press commits at once, either way', () => {
    expect(numberEdit(idle, { kind: 'step', text: '2', value: 2 }, { commitOn: 'blur', committed: 1 })).toEqual({
      state: { text: '2' },
      commit: 2,
    });
  });

  test('a blur with nothing typed commits nothing', () => {
    expect(numberEdit(idle, { kind: 'commit' }, { commitOn: 'blur', committed: 1 })).toEqual({ state: idle });
  });

  test('a value that does not parse is held as text and never committed', () => {
    expect(
      numberEdit(idle, { kind: 'type', text: '-', value: Number.NaN }, { commitOn: 'change', committed: 1 }),
    ).toEqual({
      state: { text: '-' },
    });
  });
});
