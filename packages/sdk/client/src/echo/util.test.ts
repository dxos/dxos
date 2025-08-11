//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { parseId } from './util';

describe('parseId', () => {
  test('space id', () => {
    const id = '123456789012345678901234567890123';
    expect(parseId(id)).toEqual({ spaceId: id });
  });

  test('object id', () => {
    const id = '12345678901234567890123456';
    expect(parseId(id)).toEqual({ objectId: id });
  });

  test('fully qualified id', () => {
    const id = '123456789012345678901234567890123:12345678901234567890123456';
    expect(parseId(id)).toEqual({
      spaceId: '123456789012345678901234567890123',
      objectId: '12345678901234567890123456',
    });
  });

  test('invalid id', () => {
    const id = '123456789012345678901234561234567890123456';
    expect(parseId(id)).toEqual({});
  });
});
