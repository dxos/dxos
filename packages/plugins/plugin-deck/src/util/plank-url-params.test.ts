//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { deserializePlanks, serializePlanks, stripPlanks } from './plank-url-params';

describe('serializePlanks', () => {
  test('serializes active IDs as plank query params', ({ expect }) => {
    const result = serializePlanks(['root/space1/types/doc/all/obj1', 'root/space1/types/doc/all/obj2'], '');
    expect(result).toBe('?plank=%2Fspace1%2Ftypes%2Fdoc%2Fall%2Fobj1&plank=%2Fspace1%2Ftypes%2Fdoc%2Fall%2Fobj2');
  });

  test('returns empty string for empty active array with no existing params', ({ expect }) => {
    expect(serializePlanks([], '')).toBe('');
  });

  test('preserves non-plank params', ({ expect }) => {
    const result = serializePlanks(['root/space1/types/doc/all/obj1'], '?ref=abc');
    expect(result).toContain('ref=abc');
    expect(result).toContain('plank=');
  });

  test('preserves non-plank params when active array is empty', ({ expect }) => {
    const result = serializePlanks([], '?ref=abc');
    expect(result).toBe('?ref=abc');
  });

  test('replaces existing plank params', ({ expect }) => {
    const result = serializePlanks(['root/space1/types/doc/all/obj2'], '?plank=%2Fspace1%2Ftypes%2Fdoc%2Fall%2Fobj1');
    expect(result).not.toContain('obj1');
    expect(result).toContain('obj2');
  });
});

describe('deserializePlanks', () => {
  test('deserializes plank query params to qualified IDs', ({ expect }) => {
    const url = new URL(
      'http://localhost/?plank=%2Fspace1%2Ftypes%2Fdoc%2Fall%2Fobj1&plank=%2Fspace1%2Ftypes%2Fdoc%2Fall%2Fobj2',
    );
    const result = deserializePlanks(url);
    expect(result).toEqual(['root/space1/types/doc/all/obj1', 'root/space1/types/doc/all/obj2']);
  });

  test('returns empty array when no plank params', ({ expect }) => {
    const url = new URL('http://localhost/?ref=abc');
    expect(deserializePlanks(url)).toEqual([]);
  });

  test('preserves order', ({ expect }) => {
    const url = new URL('http://localhost/?plank=%2Fa&plank=%2Fb&plank=%2Fc');
    expect(deserializePlanks(url)).toEqual(['root/a', 'root/b', 'root/c']);
  });
});

describe('stripPlanks', () => {
  test('removes plank params', ({ expect }) => {
    expect(stripPlanks('?plank=%2Fa&plank=%2Fb')).toBe('');
  });

  test('preserves non-plank params', ({ expect }) => {
    expect(stripPlanks('?ref=abc&plank=%2Fa')).toBe('?ref=abc');
  });

  test('returns empty string when no params', ({ expect }) => {
    expect(stripPlanks('')).toBe('');
  });
});

describe('round-trip', () => {
  test('serialize then deserialize returns original IDs', ({ expect }) => {
    const ids = ['root/space1/types/doc/all/obj1', 'root/space1/types/doc/all/obj2'];
    const search = serializePlanks(ids, '');
    const url = new URL(`http://localhost/${search}`);
    expect(deserializePlanks(url)).toEqual(ids);
  });

  test('handles special characters in IDs', ({ expect }) => {
    const ids = ['root/!dxos:settings', 'root/~personal/types/doc/all/obj1'];
    const search = serializePlanks(ids, '');
    const url = new URL(`http://localhost/${search}`);
    expect(deserializePlanks(url)).toEqual(ids);
  });
});
