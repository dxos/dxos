//
// Copyright 2024 DXOS.org
//

import { ulid } from 'ulidx';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { getSnapshot } from './accessors';
import { create } from './object';

describe('Object', () => {
  test.skip('ulid stress test', () => {
    const amountToGenerate = 10_000;

    const generators = [ulid];
    for (const generator of generators) {
      const start = Date.now();
      for (let i = 0; i < amountToGenerate; i++) {
        generator();
      }
      const end = Date.now();
      log.info(`Generated ${amountToGenerate} ULIDs in ${end - start}ms`);
    }
  });

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
    // NOTE: create doesn't clone `data`!!!!
    const obj = create(structuredClone(data));
    const snapshot = getSnapshot(obj);
    expect(snapshot).toEqual(data);
    obj.arr = [];
    expect(snapshot).toEqual(data);
  });
});
