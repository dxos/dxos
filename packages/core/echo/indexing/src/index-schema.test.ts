//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { type Filter } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { IndexSchema } from './index-schema';

describe('IndexSchema', () => {
  test('basic', async () => {
    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    const schemaURI = '@example.org/schema/Contact';
    const objects = [
      {
        id: '1',
        data: {
          name: 'John',
        },
        // Complaint structure with automerge storage
        system: {
          type: { itemId: schemaURI },
        },
      },
      {
        id: '2',
        data: {
          title: 'first document',
        },
        system: {
          type: { itemId: '@example.org/schema/Document' },
        },
      },
    ];

    await Promise.all(objects.map((object) => index.update(object.id, object)));

    const ids = await index.find({ type: { itemId: schemaURI } } as Filter);
    expect(ids.length).to.equal(1);
    expect(ids[0].id).to.equal('1');
  });
});
