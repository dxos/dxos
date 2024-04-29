//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { next as A } from '@dxos/automerge/automerge';
import { describe, test } from '@dxos/test';

import { execFunction, type EchoObject, type SerializedObject, type Transform } from './exec';

type TestData = {
  name: string;
};

describe('Test', () => {
  test('load and save', async () => {
    const doc1 = A.change<TestData>(A.init<TestData>(), (doc) => {
      doc.name = 'hello';
    });

    const doc2 = A.change<TestData>(doc1, (doc) => {
      doc.name += ' world!';
    });

    const mutation: SerializedObject = {
      id: 'test',
      schema: 'example.com/type/test',
      changes: A.save(doc2),
    };

    const doc3 = A.load<TestData>(mutation.changes);
    expect(doc2.name).to.eq(doc3.name);
  });

  test('function invocation', async () => {
    const objects: SerializedObject[] = [
      {
        id: 'test',
        schema: 'example.com/type/test',
        changes: A.save(
          A.change<TestData>(A.init<TestData>(), (doc) => {
            doc.name = 'hello';
          }),
        ),
      },
    ];

    const fn: Transform = async (objects: EchoObject<TestData>[]) => {
      return objects.map(({ id, schema, object }) => {
        return {
          id,
          schema,
          object: A.change<TestData>(object, (doc) => {
            doc.name += ' world!';
          }),
        };
      });
    };

    const mapper = execFunction(fn);
    const output = await mapper({ objects });
    const object = A.load<TestData>(output.objects![0].changes);
    expect(object.name).to.eq('hello world!');
  });
});
