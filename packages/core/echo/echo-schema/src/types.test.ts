//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { type JsonPath } from '.';
import { getValue, setValue, splitPath, type BaseObject } from './types';

describe('Types', () => {
  test('checks sanity', async ({ expect }) => {
    const obj: BaseObject = {};
    expect(obj).to.exist;
  });
});

describe('get/set deep', () => {
  test('path splitting', ({ expect }) => {
    const cases = [
      ['foo.bar[0].baz', ['foo', 'bar', '[0]', 'baz']],
      ['users[1].name', ['users', '[1]', 'name']],
      ['data[0][1]', ['data', '[0]', '[1]']],
      ['simple.path', ['simple', 'path']],
      ['root', ['root']],
    ] as const;

    cases.forEach(([input, expected]) => {
      expect(splitPath(input as JsonPath)).toEqual(expected);
    });
  });

  test('get/set operations', ({ expect }) => {
    const obj = {
      name: 'test',
      items: ['a', 'b', 'c'],
      nested: {
        prop: 'value',
        arr: [1, 2, 3],
      },
    };

    // Basic property access.
    expect(getValue(obj, 'name' as JsonPath)).toBe('test');

    // Array index access.
    expect(getValue(obj, 'items[1]' as JsonPath)).toBe('b');

    // Nested property access.
    expect(getValue(obj, 'nested.prop' as JsonPath)).toBe('value');

    // Nested array access.
    expect(getValue(obj, 'nested.arr[2]' as JsonPath)).toBe(3);

    // Setting values.
    const updated1 = setValue(obj, 'items[1]' as JsonPath, 'x');
    expect(updated1.items[1]).toBe('x');

    const updated2 = setValue(obj, 'nested.arr[0]' as JsonPath, 99);
    expect(updated2.nested.arr[0]).toBe(99);
  });
});
