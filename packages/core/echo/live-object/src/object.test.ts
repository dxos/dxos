//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { live } from './object';
import { getSnapshot } from './snapshot';

// TODO(burdon): Add reactive tests.

describe('Object', () => {
  test('getSnapshot', ({ expect }) => {
    const data = {
      str: 'foo',
      number: 20,
      arr: [
        {
          title: 'foo',
        },
        {
          title: 'bar',
        },
        {
          title: 'baz',
        },
      ],
    };

    // NOTE: create doesn't clone `data`.
    const obj = live(structuredClone(data));
    const snapshot = getSnapshot(obj);
    expect(snapshot).toEqual(data);
    obj.arr = [];
    expect(snapshot).toEqual(data);
  });
});
