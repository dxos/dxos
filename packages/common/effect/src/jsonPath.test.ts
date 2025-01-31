//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createJsonPath, isJsonPath, type JsonPath, splitJsonPath } from './jsonPath';

describe('createJsonPath', () => {
  test('supported path subset', () => {
    // Simple property access.
    expect(createJsonPath(['foo'])).toBe('foo');
    expect(createJsonPath(['foo', 'bar'])).toBe('foo.bar');

    // Array indexing.
    expect(createJsonPath(['foo', 0, 'bar'])).toBe('foo[0].bar');
    expect(createJsonPath(['items', 1])).toBe('items[1]');

    // $ is valid in identifiers.
    expect(createJsonPath(['$foo', '$bar'])).toBe('$foo.$bar');
  });

  test('invalid paths', () => {
    expect(createJsonPath([])).toBeUndefined(); // Empty path.
    expect(createJsonPath(['123foo'])).toBeUndefined(); // Can't start with number.
  });

  test('path splitting', () => {
    const cases = [
      ['foo.bar[0].baz', ['foo', 'bar', '0', 'baz']],
      ['users[1].name', ['users', '1', 'name']],
      ['data[0][1]', ['data', '0', '1']],
      ['simple.path', ['simple', 'path']],
      ['root', ['root']],
    ] as const;

    cases.forEach(([input, expected]) => {
      expect(splitJsonPath(input as JsonPath)).toEqual(expected);
    });
  });

  test('path splitting - extended cases', () => {
    const cases = [
      // Multiple consecutive array indices.
      ['matrix[0][1][2]', ['matrix', '0', '1', '2']],
      // Properties with underscores and $.
      ['$_foo.bar_baz', ['$_foo', 'bar_baz']],
      // Deep nesting.
      ['very.deep.nested[0].property.path[5]', ['very', 'deep', 'nested', '0', 'property', 'path', '5']],
      // Array index followed immediately by property.
      ['items[0]name', []],
      // Single character properties.
      ['a[0].b.c', ['a', '0', 'b', 'c']],
      // Properties containing numbers.
      ['prop123.item456[7]', ['prop123', 'item456', '7']],
    ] as const;

    cases.forEach(([input, expected]) => {
      expect(splitJsonPath(input as JsonPath)).toEqual(expected);
    });
  });

  test('invalid path formats', () => {
    // These should return empty array or handle gracefully.
    const invalidPaths = ['', '.', '[', ']', 'foo[].bar', 'foo[a].bar', 'foo[-1].bar'] as const;

    invalidPaths.forEach((path) => {
      expect(splitJsonPath(path as JsonPath)).toEqual([]);
    });
  });

  test('isJsonPath validation', () => {
    const validPaths = [
      'foo',
      'foo.bar',
      'foo[0].bar',
      'items[1]',
      '$foo.$bar',
      'matrix[0][1][2]',
      'deep.nested[0].path',
    ] as const;

    const invalidPaths = [
      '',
      'items[0]name', // Missing dot
      '123foo', // Starts with number
      'foo[].bar', // Empty brackets
      'foo[-1]', // Negative index
      'foo[a]', // Non-numeric index
      '.foo', // Starts with dot
      'foo.', // Ends with dot
      '[0]foo', // Starts with bracket
    ] as const;

    validPaths.forEach((path) => expect(isJsonPath(path)).toBe(true));
    invalidPaths.forEach((path) => expect(isJsonPath(path)).toBe(false));
  });
});
