//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { deepMapValues, deepMapValuesAsync } from './map-values';

test('deepMapValues', ({ expect }) => {
  const obj = {
    a: 1,
    b: {
      c: 2,
    },
    d: [
      3,
      {
        e: 4,
      },
    ],
  };

  // Double all numbers.
  const res = deepMapValues(obj, (value, recurse) => {
    if (typeof value === 'number') {
      return value * 2;
    }

    return recurse(value);
  });

  expect(res).toEqual({
    a: 2,
    b: {
      c: 4,
    },
    d: [
      6,
      {
        e: 8,
      },
    ],
  });
});

test('deepMapValuesAsync', async ({ expect }) => {
  const obj = {
    a: 1,
    b: {
      c: 2,
    },
    d: [
      3,
      {
        e: 4,
      },
    ],
  };

  // Double all numbers.
  const res = await deepMapValuesAsync(obj, async (value, recurse) => {
    if (typeof value === 'number') {
      await Promise.resolve();
      return value * 2;
    }

    return recurse(value);
  });

  expect(res).toEqual({
    a: 2,
    b: {
      c: 4,
    },
    d: [
      6,
      {
        e: 8,
      },
    ],
  });
});
