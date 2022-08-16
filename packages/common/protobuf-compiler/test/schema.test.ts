//
// Copyright 2022 DXOS.org
//

import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join } from 'path';
import { it as test } from 'mocha'
import expect from 'expect'

import { MyKey } from './my-key';
import { schema } from './proto/gen';
import { ComplexFields, OptionalScalars, Outer, Scalars, TaskList, TaskType, WithTimestamp } from './proto/gen/dxos/test';
import { TestFoo } from './proto/gen/dxos/test/testfoo';

describe('Schema', () => {

  test('encode and decode', async () => {
    const codec = schema.getCodecForType('dxos.test.TaskList');

    const initial: TaskList = {
      tasks: [
        {
          id: 'foo',
          title: 'Bar',
          key: new MyKey(Buffer.from('foo')),
          type: TaskType.COMPLETED,
          googleAny: {
            '@type': 'dxos.test.SubstitutedByInterface',
            foo: 'foo'
          }
        },
        {
          id: 'baz',
          title: 'Baz',
          key: new MyKey(Buffer.from('foo')),
          type: TaskType.IN_PROGRESS
        }
      ]
    };

    const encoded = codec.encode(initial);

    expect(encoded).toBeInstanceOf(Uint8Array);

    const decoded = codec.decode(encoded);

    expect(decoded).toEqual(initial);
  });

  test('encode and decode external package message', async () => {
    const codec = schema.getCodecForType('dxos.test.testfoo.TestFoo');

    const initial: TestFoo = { fizz: 3, bazz: '5' };

    const encoded = codec.encode(initial);

    expect(encoded).toBeInstanceOf(Uint8Array);

    const decoded = codec.decode(encoded);

    expect(decoded).toEqual(initial);

    expect(() => {
      const encoded = codec.encode({ badname: 'badvalue' } as any);

      expect(encoded).toBeInstanceOf(Uint8Array);

      const decoded = codec.decode(encoded);

      expect(decoded).toEqual(initial);
    }).toThrow();
  });

  test('complex fields round trip', () => {
    const codec = schema.getCodecForType('dxos.test.ComplexFields');

    const initial: ComplexFields = {
      repeatedField: [new MyKey(Buffer.from('foo')), new MyKey(Buffer.from('bar'))],
      requiredField: new MyKey(Buffer.from('foo')),
      mappedField: {
        foo: new MyKey(Buffer.from('foo')),
        bar: new MyKey(Buffer.from('foo'))
      },
      inner: {
        bar: ComplexFields.InnerEnum.BAR,
        foo: 'foo'
      },
      myAny: {
        foo: 'foo'
      },
      googleAny: {
        '@type': 'dxos.test.Task',
        id: 'baz',
        title: 'Baz',
        key: new MyKey(Buffer.from('foo')),
        type: TaskType.IN_PROGRESS
      },
      importedAny: {
        bar: 123
      }
    };

    const encoded = codec.encode(initial);
    expect(encoded).toBeInstanceOf(Uint8Array);

    const decoded = codec.decode(encoded);
    expect(decoded).toEqual(initial);
  });

  test('encodes empty repeated fields as empty arrays', () => {
    const codec = schema.getCodecForType('dxos.test.ComplexFields');

    const initial: ComplexFields = {
      repeatedField: [],
      requiredField: new MyKey(Buffer.from('foo')),
      inner: {
        bar: ComplexFields.InnerEnum.BAR,
        foo: 'foo'
      },
      myAny: {
        foo: 'foo'
      },
      googleAny: {
        '@type': 'dxos.test.Task',
        id: 'baz',
        title: 'Baz',
        key: new MyKey(Buffer.from('foo')),
        type: TaskType.IN_PROGRESS
      },
      importedAny: {
        bar: 123
      }
    };

    const encoded = codec.encode(initial);
    expect(encoded).toBeInstanceOf(Uint8Array);

    const decoded = codec.decode(encoded);
    expect(decoded).toEqual(initial);
  });

  describe('Scalars', () => {
    test('required', () => {
      const codec = schema.getCodecForType('dxos.test.Scalars');

      const initial: Scalars = {
        doubleField: 0.52,
        floatField: 1.5,
        int32Field: -54,
        int64Field: '-55',
        uint32Field: 314,
        uint64Field: '34',
        sint32Field: 3123,
        sint64Field: '3123',
        fixed32Field: 22,
        fixed64Field: '312312312',
        sfixed32Field: 45,
        sfixed64Field: '312313123',
        boolField: true,
        stringField: 'hello',
        bytesField: Buffer.from('world')
      };

      const encoded = codec.encode(initial);
      expect(encoded).toBeInstanceOf(Uint8Array);
      const decoded = codec.decode(encoded);
      expect(decoded).toEqual(initial);
    });

    test('default values on required', () => {
      const codec = schema.getCodecForType('dxos.test.Scalars');

      const initial: Scalars = {
        doubleField: 0.0,
        floatField: 0.0,
        int32Field: 0,
        int64Field: '0',
        uint32Field: 0,
        uint64Field: '0',
        sint32Field: 0,
        sint64Field: '0',
        fixed32Field: 0,
        fixed64Field: '0',
        sfixed32Field: 0,
        sfixed64Field: '0',
        boolField: false,
        stringField: '',
        bytesField: Buffer.from('')
      };

      const encoded = codec.encode(initial);
      expect(encoded).toBeInstanceOf(Uint8Array);
      const decoded = codec.decode(encoded);
      expect(decoded).toEqual(initial);
    });

    test('required fields are assigned their default values when missing on the wire', () => {
      const codec = schema.getCodecForType('dxos.test.Scalars');

      const expected: Scalars = {
        doubleField: 0.0,
        floatField: 0.0,
        int32Field: 0,
        int64Field: '0',
        uint32Field: 0,
        uint64Field: '0',
        sint32Field: 0,
        sint64Field: '0',
        fixed32Field: 0,
        fixed64Field: '0',
        sfixed32Field: 0,
        sfixed64Field: '0',
        boolField: false,
        stringField: '',
        bytesField: new Uint8Array()
      };
      const decoded = codec.decode(Buffer.from(''));
      expect(decoded).toEqual(expected);
    })

    test('optional', () => {
      const codec = schema.getCodecForType('dxos.test.OptionalScalars');

      const initial: OptionalScalars = {
        doubleField: 0.52,
        floatField: 1.5,
        int32Field: -54,
        int64Field: '-55',
        uint32Field: 314,
        uint64Field: '34',
        sint32Field: 3123,
        sint64Field: '3123',
        fixed32Field: 22,
        fixed64Field: '312312312',
        sfixed32Field: 45,
        sfixed64Field: '312313123',
        boolField: true,
        stringField: 'hello',
        bytesField: Buffer.from('world')
      };

      const encoded = codec.encode(initial);
      expect(encoded).toBeInstanceOf(Uint8Array);

      const decoded = codec.decode(encoded);
      expect(decoded).toEqual(initial);
    });

    test('empty optional', () => {
      const codec = schema.getCodecForType('dxos.test.OptionalScalars');

      const initial: OptionalScalars = {};
      const encoded = codec.encode(initial);
      expect(encoded).toBeInstanceOf(Uint8Array);
      const decoded = codec.decode(encoded);
      expect(decoded).toEqual(initial);
    });

    describe('optional fields are assigned undefined when missing on the wire', () => {
      const codec = schema.getCodecForType('dxos.test.OptionalScalars');

      const expected: OptionalScalars = {
      };
      const decoded = codec.decode(Buffer.from(''));
      expect(decoded).toEqual(expected);
    })
  })

  test('default values for missing message-typed fields', () => {
    const codec = schema.getCodecForType('dxos.test.Outer');

    const expected: Outer = {
      inner: {
        num: 0,
      }
    };
    const decoded = codec.decode(Buffer.from(''));
    expect(decoded).toEqual(expected);
  })


  test('timestamp', () => {
    const codec = schema.getCodecForType('dxos.test.WithTimestamp');

    const initial: WithTimestamp = {
      timestamp: new Date('2021-09-17T09:46:04Z')
    };

    const encoded = codec.encode(initial);

    expect(encoded).toBeInstanceOf(Uint8Array);

    const decoded = codec.decode(encoded);

    expect(decoded).toEqual(initial);
  });

});
