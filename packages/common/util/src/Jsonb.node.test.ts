//
// Copyright 2026 DXOS.org
//

import { DatabaseSync } from 'node:sqlite';
import { describe, test } from 'vitest';

import * as Jsonb from './Jsonb.ts';

const db = new DatabaseSync(':memory:');

/** The single column `value` of a one-row query. */
const scalar = (query: string, parameter: string | Uint8Array): unknown => {
  const row = db.prepare(query).get(parameter);
  return row === undefined || row === null ? undefined : Reflect.get(row, 'value');
};

/** SQLite's own encoding of a JSON (or JSON5) text. */
const jsonb = (text: string): Uint8Array => {
  const value = scalar('SELECT jsonb(?) AS value', text);
  if (!(value instanceof Uint8Array)) {
    throw new Error('jsonb() did not return a blob');
  }
  return value;
};

/** A deterministic generator, so a failing fuzz case reproduces from its seed. */
const random = (seed: number) => () => {
  seed = (seed * 1_103_515_245 + 12_345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

const ALPHABET = ['a', 'Z', '0', ' ', '"', '\\', '\n', '\t', '\u0001', 'é', 'ж', '設', '🚀', ' ', '/'];

const randomValue = (next: () => number, depth: number): unknown => {
  const pick = Math.floor(next() * (depth > 3 ? 6 : 8));
  switch (pick) {
    case 0:
      return null;
    case 1:
      return next() < 0.5;
    case 2:
      return Math.floor((next() - 0.5) * 2 ** (next() * 60));
    case 3:
      return (next() - 0.5) * 10 ** Math.floor(next() * 40 - 20);
    case 4:
    case 5:
      return Array.from({ length: Math.floor(next() * 40) }, () => ALPHABET[Math.floor(next() * ALPHABET.length)]).join(
        '',
      );
    case 6:
      return Array.from({ length: Math.floor(next() * 6) }, () => randomValue(next, depth + 1));
    default:
      return Object.fromEntries(
        Array.from({ length: Math.floor(next() * 6) }, (_, index) => [
          `${randomValue(next, 99)}${index}`,
          randomValue(next, depth + 1),
        ]),
      );
  }
};

describe('Jsonb', () => {
  test('decodes what JSON.parse returns for the same text', ({ expect }) => {
    const cases: unknown[] = [
      null,
      true,
      0,
      -0.000001,
      2 ** 63,
      '',
      'x'.repeat(70_000),
      [],
      {},
      { nested: { deeper: [{}, [], [[1]]] } },
      { text: 'ремонт 設計 🚀', escapes: 'q"\\\t\n\u0001/', lone: '\ud800' },
      { '/': { bytes: 'AAEC' } },
    ];
    for (const value of cases) {
      const text = JSON.stringify(value);
      expect(Jsonb.decode(jsonb(text))).toEqual(JSON.parse(text));
    }
  });

  test('agrees with SQLite on random values', ({ expect }) => {
    for (let seed = 1; seed <= 500; seed++) {
      const text = JSON.stringify(randomValue(random(seed), 0));
      const bytes = jsonb(text);
      // SQLite's own rendering of its JSONB is the reference: the reader must agree with it, not merely
      // with the input, since `jsonb()` is free to pick any element type for a value.
      const reference = scalar('SELECT json(?) AS value', bytes);
      expect(typeof reference).toBe('string');
      expect(Jsonb.decode(bytes), `seed ${seed}`).toEqual(JSON.parse(String(reference)));
    }
  });

  test('decodes JSON5 element types', ({ expect }) => {
    expect(Jsonb.decode(jsonb(`{a: 0x1F, b: +5, c: .5, d: -0x10, e: 'it\\'s', f: "\\x41"}`))).toEqual({
      a: 31,
      b: 5,
      c: 0.5,
      d: -16,
      e: "it's",
      f: 'A',
    });
    // SQLite stores JSON5 `NaN` as `null`.
    expect(Jsonb.decode(jsonb('[Infinity, -Infinity, NaN]'))).toEqual([Infinity, -Infinity, null]);
  });

  test('applies mapObject innermost first', ({ expect }) => {
    const seen: string[] = [];
    const value = Jsonb.decode(jsonb('{"outer": {"inner": {"/": "ref"}}}'), {
      mapObject: (object) => {
        seen.push(Object.keys(object).join(','));
        return '/' in object ? `ref:${object['/']}` : object;
      },
    });
    expect(seen).toEqual(['/', 'inner', 'outer']);
    expect(value).toEqual({ outer: { inner: 'ref:ref' } });
  });

  test('reads one top-level string without decoding the rest', ({ expect }) => {
    const bytes = jsonb(JSON.stringify({ 'id': 'abc', '@type': 'dxn:type', 'count': 3, 'nested': { '@type': 'no' } }));
    expect(Jsonb.readTopLevelString(bytes, '@type')).toBe('dxn:type');
    expect(Jsonb.readTopLevelString(bytes, 'count')).toBeUndefined();
    expect(Jsonb.readTopLevelString(bytes, 'missing')).toBeUndefined();
    expect(Jsonb.readTopLevelString(jsonb('[1]'), '@type')).toBeUndefined();
  });

  test('tells JSONB from JSON text', ({ expect }) => {
    expect(Jsonb.isObject(jsonb('{"a": 1}'))).toBe(true);
    expect(Jsonb.isObject(new TextEncoder().encode('{"a": 1}'))).toBe(false);
  });

  test('rejects truncated and trailing bytes', ({ expect }) => {
    const bytes = jsonb('{"a": [1, 2, 3]}');
    expect(() => Jsonb.decode(bytes.subarray(0, bytes.length - 1))).toThrow(SyntaxError);
    expect(() => Jsonb.decode(new Uint8Array([...bytes, 0]))).toThrow(SyntaxError);
  });
});
