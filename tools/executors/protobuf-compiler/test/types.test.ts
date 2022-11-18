//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { MyKey } from './my-key';
import { schema } from './proto';
import {
  ComplexFields,
  OptionalScalars,
  Outer,
  Scalars,
  TaskList,
  TaskType,
  WithTimestamp
} from './proto/gen/example/testing/types';
import { Test } from './proto/gen/example/testing/util'; // NOTE: From protobuf-test.

// TODO(burdon): Remove foo, bar, etc.

describe('Schema', function () {
  test('encode and decode', async () => {
    const codec = schema.getCodecForType('example.testing.types.TaskList');

    const initial: TaskList = {
      tasks: [
        {
          id: 'task-1',
          title: 'Task 1',
          key: new MyKey(Buffer.from('task-1')),
          type: TaskType.COMPLETED,
          googleAny: {
            '@type': 'example.testing.types.SubstitutedByInterface',
            data: 'test'
          }
        },
        {
          id: 'task-2',
          title: 'Task Two',
          key: new MyKey(Buffer.from('task-1')),
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
    const codec = schema.getCodecForType('example.testing.util.Test');

    const initial: Test = { foo: 3, bar: '5' };

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
    const codec = schema.getCodecForType('example.testing.types.ComplexFields');

    // TODO(burdon): Remove foo/bar.
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
        '@type': 'example.testing.Task',
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
    const codec = schema.getCodecForType('example.testing.types.ComplexFields');

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
        '@type': 'example.testing.Task',
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

  describe('Scalars', function () {
    test('required', () => {
      const codec = schema.getCodecForType('example.testing.types.Scalars');

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
      const codec = schema.getCodecForType('example.testing.types.Scalars');

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
      const codec = schema.getCodecForType('example.testing.types.Scalars');

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
    });

    test('optional', () => {
      const codec = schema.getCodecForType('example.testing.types.OptionalScalars');

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
      const codec = schema.getCodecForType('example.testing.types.OptionalScalars');

      const initial: OptionalScalars = {};

      const encoded = codec.encode(initial);
      expect(encoded).toBeInstanceOf(Uint8Array);

      const decoded = codec.decode(encoded);
      expect(decoded).toEqual(initial);
    });

    describe('optional fields are assigned undefined when missing on the wire', function () {
      const codec = schema.getCodecForType('example.testing.types.OptionalScalars');

      const expected: OptionalScalars = {};

      const decoded = codec.decode(Buffer.from(''));
      expect(decoded).toEqual(expected);
    });
  });

  test('default values for missing message-typed fields', () => {
    const codec = schema.getCodecForType('example.testing.types.Outer');

    const expected: Outer = {
      inner: {
        num: 0
      }
    };

    const decoded = codec.decode(Buffer.from(''));
    expect(decoded).toEqual(expected);
  });

  test('timestamp', () => {
    const codec = schema.getCodecForType('example.testing.types.WithTimestamp');

    const initial: WithTimestamp = {
      timestamp: new Date('2021-09-17T09:46:04Z')
    };

    const encoded = codec.encode(initial);
    expect(encoded).toBeInstanceOf(Uint8Array);

    const decoded = codec.decode(encoded);
    expect(decoded).toEqual(initial);
  });
});
