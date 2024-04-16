//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Reference } from '@dxos/echo-db';
import { encodeReference, type ObjectStructure } from '@dxos/echo-pipeline';
import { type Filter } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { IndexSchema } from './index-schema';

describe('IndexSchema', () => {
  test('basic', async () => {
    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    const schemaURI = '@example.org/schema/Contact';
    const objects: Partial<ObjectStructure>[] = [
      {
        data: {
          name: 'John',
        },
        // Complaint structure with automerge storage
        system: {
          type: encodeReference(new Reference(schemaURI)),
        },
      },
      {
        data: {
          title: 'first document',
        },
        system: {
          type: encodeReference(new Reference('@example.org/schema/Document')),
        },
      },
    ];

    await Promise.all(objects.map((object, id) => index.update(String(id), object)));

    const ids = await index.find({ type: { itemId: schemaURI } } as Filter);
    expect(ids.length).to.equal(1);
    expect(ids[0].id).to.equal('0');
  });
});
