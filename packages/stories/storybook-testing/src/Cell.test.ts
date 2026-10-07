//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Cell from './Cell.ts';

describe('Cell', () => {
  const object = { id: 'obj-1' } as any;

  test('article binds the object with no explicit token', () => {
    const cell = Cell.article(object);
    expect(cell).toMatchObject({ object });
    expect(cell.token).toBeUndefined();
  });

  test('article variant flows into surface data', () => {
    const cell = Cell.article(object, { variant: 'compact' });
    expect(cell.data).toMatchObject({ variant: 'compact' });
  });

  test('companion sets subject + companionTo', () => {
    const cell = Cell.companion(object, 'history');
    expect(cell).toMatchObject({ object, data: { subject: 'history', companionTo: object } });
  });
});
