//
// Copyright 2025 DXOS.org
//

import { describe, test, expect } from 'vitest';

import * as Struct from './Struct';

class Foo {
  constructor(public value: string) {}
}
Struct.registerSerializer(Foo.prototype, {
  typeId: '@dxos/struct/test/Foo',
  serialize: (value) => ({ value: value.value }),
  deserialize: ({ value }: any) => new Foo(value),
});

class Bar {
  constructor(public value: string) {}
}

describe('Struct', () => {
  test('noop on plain object', () => {
    const obj = {
      a: 1,
      b: '2',
      c: [1, 2, 3],
      d: {
        e: 4,
        f: '5',
      },
      g: null,
      h: undefined,
      i: true,
      j: false,
    };

    expect(Struct.serialize(obj)).toEqual(obj);
    expect(Struct.deserialize(obj)).toEqual(obj);
  });

  test('serialize struct', () => {
    const obj = new Foo('test');
    expect(Struct.serialize(obj)).toEqual({
      '@type': '@dxos/struct/test/Foo',
      value: 'test',
    });
  });

  test('serialize deep', () => {
    const deep = [
      {
        id: 1,
        value: new Foo('test'),
      },
      {
        id: 2,
        value: new Foo('test2'),
      },
    ];

    const serialized = Struct.serialize(deep);
    expect(serialized).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "value": {
            "@type": "@dxos/struct/test/Foo",
            "value": "test",
          },
        },
        {
          "id": 2,
          "value": {
            "@type": "@dxos/struct/test/Foo",
            "value": "test2",
          },
        },
      ]
    `);

    const deserialized = Struct.deserialize(serialized);
    expect(deserialized).toEqual(deep);
  });

  test('throws on class instances that do not implement ToStruct', () => {
    const obj = new Bar('test');
    expect(() => Struct.serialize(obj)).toThrowErrorMatchingInlineSnapshot(
      '[TypeError: Encountered a non-plain object without registered serializer]',
    );
  });
});
