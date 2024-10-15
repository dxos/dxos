//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DateUtil } from './date';

describe('DateUtil', () => {
  test('date', () => {
    const date = new Date(1900, 0, 1);
    expect(DateUtil.toDate(date.getTime())).to.deep.eq({ year: 1900, month: 1, day: 1 });
  });
});
