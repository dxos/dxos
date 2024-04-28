//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { next as A } from '@dxos/automerge/automerge';
import { describe, test } from '@dxos/test';

import type { SerializedObject } from './postHandler';

type TestData = {
  name: string;
};

describe('Test', () => {
  test('checks sanity', async () => {
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
});
