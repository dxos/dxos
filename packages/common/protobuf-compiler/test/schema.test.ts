import { schema } from './gen';
import { ComplexFields, Scalars, TaskList, TaskType, WithTimestamp } from './gen/dxos/test'
import { MyKey } from './my-key';
import { readFileSync, readdirSync, lstatSync } from 'fs'
import { join } from 'path'
import { loadSync } from 'protobufjs';

test('encode and decode', async () => {
  const codec = schema.getCodecForType('dxos.test.TaskList')

  const initial: TaskList = {
    tasks: [
      {
        id: 'foo',
        title: 'Bar',
        key: new MyKey(Buffer.from('foo')),
        type: TaskType.COMPLETED,
        googleAny: {
          __type_url: 'dxos.test.SubstitutedByInterface',
          foo: 'foo',
        }
      },
      {
        id: 'baz',
        title: 'Baz',
        key: new MyKey(Buffer.from('foo')),
        type: TaskType.IN_PROGRESS,
      }
    ],
  }

  const encoded = codec.encode(initial)
  
  expect(encoded).toBeInstanceOf(Uint8Array);

  const decoded = codec.decode(encoded)

  expect(decoded).toEqual(initial)
})

test('complex fields round trip', () => {
  const codec = schema.getCodecForType('dxos.test.ComplexFields');

  const initial: ComplexFields = {
    repeatedField: [new MyKey(Buffer.from('foo')), new MyKey(Buffer.from('bar'))],
    requiredField: new MyKey(Buffer.from('foo')),
    mappedField: {
      foo: new MyKey(Buffer.from('foo')),
      bar: new MyKey(Buffer.from('foo')),
    },
    inner: {
      bar: ComplexFields.InnerEnum.BAR,
      foo: 'foo'
    },
    myAny: {
      foo: 'foo'
    },
    googleAny: {
      __type_url: 'dxos.test.Task',
      id: 'baz',
      title: 'Baz',
      key: new MyKey(Buffer.from('foo')),
      type: TaskType.IN_PROGRESS,
    },
    importedAny: {
      bar: 123,
    },
  }

  const encoded = codec.encode(initial)
  
  expect(encoded).toBeInstanceOf(Uint8Array);

  const decoded = codec.decode(encoded)

  expect(decoded).toEqual(initial)
})

test('scalars', () => {
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
    bytesField: Buffer.from('world'),
  }

  const encoded = codec.encode(initial)
  
  expect(encoded).toBeInstanceOf(Uint8Array);

  const decoded = codec.decode(encoded)

  expect(decoded).toEqual(initial)
})

test('timestamp', () => {
  const codec = schema.getCodecForType('dxos.test.WithTimestamp')

  const initial: WithTimestamp = {
    timestamp: new Date('2021-09-17T09:46:04Z')
  }

  const encoded = codec.encode(initial)
  
  expect(encoded).toBeInstanceOf(Uint8Array);

  const decoded = codec.decode(encoded)

  expect(decoded).toEqual(initial)
})

test('definitions', () => {
  expect(readDirectoryFiles(join(__dirname, 'gen'))).toMatchSnapshot()
})


function readDirectoryFiles(dir: string) {
  let res = ''
  for(const file of listFilesRecursive(dir)) {
    res += `${file}:\n`
    res += readFileSync(join(dir, file), { encoding: 'utf-8' })
    res += '\n'
  }
  return res
}

function* listFilesRecursive(dir: string): Generator<string> {
  for (const file of readdirSync(dir)) {
    if(lstatSync(join(dir, file)).isDirectory()) {
      for(const sub of listFilesRecursive(join(dir, file))) {
        yield join(file, sub)
      }
    } else {
      yield file;
    }
  }
}
