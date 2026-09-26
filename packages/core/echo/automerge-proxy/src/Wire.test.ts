//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';

import * as Contract from './Contract.ts';
import * as Wire from './Wire.ts';

/** Stands in for Automerge's RawString, which carries this marker as an own property. */
class TestRawString {
  constructor(readonly val: string) {
    Reflect.set(this, Symbol.for('_am_immutableString'), true);
  }

  toString() {
    return this.val;
  }
}

const options = { rawString: (text: string) => new TestRawString(text) };

/** What the worker transport does to a value: encode as JSON, parse on the other side. */
const acrossTheWire = (value: unknown) => Wire.decode(JSON.parse(JSON.stringify(Wire.encode(value))), options);

describe('copy values on the wire', () => {
  test('plain JSON goes as it is', () => {
    const value = { title: 'a', list: [1, 'two', { three: true, four: null }] };
    expect(Wire.encode(value)).toBe(value);
    expect(acrossTheWire(value)).toEqual(value);
  });

  test('RawString, bytes and dates survive JSON', () => {
    const value = {
      long: new TestRawString('text'),
      bytes: new Uint8Array([0, 1, 255]),
      when: new Date(1_700_000_000_000),
      nested: [{ more: new Uint8Array([7]) }],
    };
    const restored = acrossTheWire(value);
    expect(restored).toEqual(value);
    expect(Reflect.get(Object(restored), 'long')).toBeInstanceOf(TestRawString);
  });

  test('numbers JSON cannot carry survive', () => {
    const value = {
      nan: Number.NaN,
      up: Number.POSITIVE_INFINITY,
      down: Number.NEGATIVE_INFINITY,
      zero: -0,
      list: [-0],
    };
    const restored = acrossTheWire(value);
    expect(restored).toEqual(value);
    expect(Object.is(Reflect.get(Object(restored), 'zero'), -0)).toBe(true);
  });

  test('an object that looks like a tag is not read as one', () => {
    const value = { data: { '/bytes': 'not bytes' }, other: { '/escape': { '/date': 1 } } };
    expect(acrossTheWire(value)).toEqual(value);
  });

  test('bytes larger than one encoding chunk survive', () => {
    const bytes = Uint8Array.from({ length: 100_000 }, (_, index) => index % 256);
    expect(acrossTheWire({ bytes })).toEqual({ bytes });
  });

  test('any value Automerge stores survives JSON', () => {
    const TAGS = ['/rawString', '/bytes', '/date', '/escape'];
    // Keys include the tag names, so objects that look like tags are generated too.
    const key = fc.oneof(fc.string({ maxLength: 4 }), fc.constantFrom(...TAGS));
    const leaf = fc.oneof(
      fc.string(),
      fc.double(),
      fc.constantFrom(-0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
      fc.boolean(),
      fc.constant(null),
      fc.string().map((text) => new TestRawString(text)),
      fc.uint8Array({ maxLength: 16 }),
      fc.date({ noInvalidDate: true }),
    );
    const { value } = fc.letrec<{ value: unknown }>((tie) => ({
      value: fc.oneof(
        { depthSize: 'small' },
        leaf,
        fc.array(tie('value'), { maxLength: 4 }),
        fc.dictionary(key, tie('value'), { maxKeys: 4 }),
      ),
    }));
    fc.assert(
      fc.property(value, (input) => {
        expect(acrossTheWire(input)).toEqual(input);
      }),
      { numRuns: 500 },
    );
  });

  test('a copy crosses the JSON codec the worker transport encodes with', () => {
    const codec = Schema.toCodecJson(Contract.DocumentEvent);
    const event: Contract.DocumentEvent = {
      type: 'copy',
      documentId: 'document',
      heads: ['head'],
      value: { long: new TestRawString('text'), bytes: new Uint8Array([1, 2]), when: new Date(5) },
    };
    expect(() => Schema.encodeSync(codec)(event)).toThrow();
    const sent = JSON.parse(JSON.stringify(Schema.encodeSync(codec)(Wire.encodeEvent(event))));
    expect(Wire.decodeEvent(Schema.decodeUnknownSync(codec)(sent), options)).toEqual(event);
  });
});
