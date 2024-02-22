//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { IndexSchema } from './index-schema';
import { type Filter } from '../query';

describe('IndexSchema', () => {
  test('basic', async () => {
    const index = new IndexSchema();

    const schemaURI = 'dxos.org/test/Contact';
    const objects = [
      { id: '1', name: 'John', schema: schemaURI },
      { id: '2', title: 'first document', schema: 'dxos.org/test/Document' },
    ];

    await Promise.all(objects.map((object) => index.updateObject(object.id, object)));

    const ids = await index.find({ type: { itemId: schemaURI } } as Filter);
    expect(ids).to.deep.equal(['1']);
  });
});
