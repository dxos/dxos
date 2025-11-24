//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type JsonPath, createJsonPath, getField, isJsonPath, splitJsonPath } from './json-path';

describe('createJsonPath', () => {
  test('supported path subset', () => {
    // Simple property access.
    expect(createJsonPath(['foo'])).toBe('foo');
    expect(createJsonPath(['foo', 'bar'])).toBe('foo.bar');
    expect(createJsonPath(['names', 1, 'bar'])).toBe('names[1].bar');
    expect(createJsonPath(['names', 1])).toBe('names[1]');
    expect(createJsonPath(['names', 1, 'names'])).toBe('names[1].names');

    // Array indexing.
    expect(createJsonPath(['foo', 0, 'bar'])).toBe('foo[0].bar');
    expect(createJsonPath(['items', 1])).toBe('items[1]');

    // $ is valid in identifiers.
    expect(createJsonPath(['$foo', '$bar'])).toBe('$foo.$bar');
    expect(createJsonPath([])).toBe('');
  });

  test('invalid paths', () => {
    expect(() => createJsonPath(['123foo'])).toThrow(); // Can't start with number.
    expect(() => createJsonPath(['foo', -1, 'bar'])).toThrow(); // No negative indices.
    expect(() => createJsonPath(['foo', 1.5, 'bar'])).toThrow(); // No float indices.
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
    // Valid paths.
    expect(isJsonPath('')).toBe(true);
    expect(isJsonPath('foo')).toBe(true);
    expect(isJsonPath('foo.bar')).toBe(true);
    expect(isJsonPath('foo[0].bar')).toBe(true);
    expect(isJsonPath('items[1]')).toBe(true);
    expect(isJsonPath('$foo.$bar')).toBe(true);
    expect(isJsonPath('matrix[0][1][2]')).toBe(true);
    expect(isJsonPath('deep.nested[0].path')).toBe(true);

    // Invalid paths.
    expect(isJsonPath('items[0]name')).toBe(false); // Missing dot
    expect(isJsonPath('123foo')).toBe(false); // Starts with number
    expect(isJsonPath('foo[].bar')).toBe(false); // Empty brackets
    expect(isJsonPath('foo[-1]')).toBe(false); // Negative index
    expect(isJsonPath('foo[a]')).toBe(false); // Non-numeric index
    expect(isJsonPath('.foo')).toBe(false); // Starts with dot
    expect(isJsonPath('foo.')).toBe(false); // Ends with dot
    expect(isJsonPath('[0]foo')).toBe(false); // Starts with bracket
  });

  test('getField', () => {
    expect(getField({ a: { b: { c: 1 } } }, 'a.b.c' as JsonPath)).toBe(1);
    expect(getField({ a: 'foo' }, 'a' as JsonPath)).toBe('foo');
  });
});
