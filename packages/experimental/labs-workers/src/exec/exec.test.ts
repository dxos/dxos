//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { next as A } from '@dxos/automerge/automerge';
import { describe, test } from '@dxos/test';

import {
  deserializeObjects,
  type EchoObject,
  execFunction,
  fromBuffer,
  type Input,
  type SerializedObject,
  serializeObjects,
  toBuffer,
  type Transform,
} from './exec';

type TestType = {
  name: string;
};

describe('Test', () => {
  test('load and save', async () => {
    const doc1 = A.change<TestType>(A.init<TestType>(), (doc) => {
      doc.name = 'hello';
    });

    const doc2 = A.change<TestType>(doc1, (doc) => {
      doc.name += ' world!';
    });

    const mutation: SerializedObject = {
      id: 'test',
      schema: 'example.com/type/Test',
      changes: toBuffer(A.save(doc2)),
    };

    const doc3 = A.load<TestType>(fromBuffer(mutation.changes));
    expect(doc2.name).to.eq(doc3.name);
  });

  test('call function', async () => {
    const testObjects: EchoObject<TestType>[] = [
      {
        id: 'game-1',
        schema: 'example.com/type/Test',
        object: A.change<TestType>(A.init<TestType>(), (obj) => {
          obj.name = 'hello';
        }),
      },
    ];

    const input: Input = {
      objects: serializeObjects(testObjects),
    };

    const fn: Transform<TestType, TestType> = async (objects) => {
      return objects.map(({ id, schema, object }) => {
        return {
          id,
          schema,
          object: A.change<TestType>(object, (doc) => {
            doc.name += ' world!';
          }),
        };
      });
    };

    const mapper = execFunction(fn);
    const output = await mapper(input);

    const objects = deserializeObjects(output.objects ?? []);
    expect(objects[0].object.name).to.eq('hello world!');
  });
});
